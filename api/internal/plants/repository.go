package plants

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	DB *pgxpool.Pool
}

func (r *Repository) ListAll(userId int, search string) ([]Plant, error) {
	// CTE combines both tables, DISTINCT ON (lower(name)) deduplicates
	// case-insensitively, preferring global plants (priority 1) over user
	// plants (priority 2) when names collide.
	rows, err := r.DB.Query(context.Background(),
		`WITH combined AS (
		   SELECT id, name, created_at, updated_at, 'global'::text AS source, 1 AS priority
		     FROM plants
		    WHERE name ILIKE '%' || $1 || '%'
		   UNION ALL
		   SELECT id, name, created_at, updated_at, 'user'::text AS source, 2 AS priority
		     FROM user_plants
		    WHERE user_id = $2 AND name ILIKE '%' || $1 || '%'
		 )
		 SELECT DISTINCT ON (lower(name)) id, name, created_at, updated_at, source
		   FROM combined
		  ORDER BY lower(name), priority
		  LIMIT 50`,
		search, userId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Plant
	for rows.Next() {
		var p Plant
		if err := rows.Scan(&p.Id, &p.Name, &p.CreatedAt, &p.UpdatedAt, &p.Source); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (r *Repository) FindOrCreateUserPlant(userId int, name string) (int, error) {
	var id int
	err := r.DB.QueryRow(context.Background(),
		`INSERT INTO user_plants (user_id, name) VALUES ($1, $2)
		 ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id`,
		userId, name,
	).Scan(&id)
	return id, err
}

func (r *Repository) PlantOnCell(plotId int, plantId *int, userPlantId *int, col, row int) (*PlotPlant, error) {
	var pp PlotPlant
	err := r.DB.QueryRow(context.Background(),
		`INSERT INTO plot_plants (plot_id, plant_id, user_plant_id, col, row)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (plot_id, col, row) WHERE NOT is_archived DO UPDATE
		   SET plant_id = EXCLUDED.plant_id,
		       user_plant_id = EXCLUDED.user_plant_id,
		       updated_at = NOW()
		 RETURNING id, plot_id, plant_id, user_plant_id, col, row, created_at, updated_at, is_archived`,
		plotId, plantId, userPlantId, col, row,
	).Scan(&pp.Id, &pp.PlotId, &pp.PlantId, &pp.UserPlantId, &pp.Col, &pp.Row, &pp.CreatedAt, &pp.UpdatedAt, &pp.IsArchived)
	if err != nil {
		return nil, err
	}

	if pp.PlantId != nil {
		err = r.DB.QueryRow(context.Background(),
			`SELECT name FROM plants WHERE id = $1`, *pp.PlantId,
		).Scan(&pp.PlantName)
	} else {
		err = r.DB.QueryRow(context.Background(),
			`SELECT name FROM user_plants WHERE id = $1`, *pp.UserPlantId,
		).Scan(&pp.PlantName)
	}
	if err != nil {
		return nil, err
	}

	return &pp, nil
}

// ListForPlot returns the currently-active (non-archived) plot_plants for a
// plot — i.e. what's actually occupying each cell right now.
func (r *Repository) ListForPlot(plotId int) ([]PlotPlant, error) {
	rows, err := r.DB.Query(context.Background(),
		`SELECT pp.id, pp.plot_id, pp.plant_id, pp.user_plant_id, pp.col, pp.row, pp.created_at, pp.updated_at, pp.is_archived,
		        COALESCE(p.name, up.name) AS plant_name
		 FROM plot_plants pp
		 LEFT JOIN plants p ON pp.plant_id = p.id
		 LEFT JOIN user_plants up ON pp.user_plant_id = up.id
		 WHERE pp.plot_id = $1 AND NOT pp.is_archived
		 ORDER BY pp.row, pp.col`,
		plotId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plotPlants []PlotPlant
	for rows.Next() {
		var pp PlotPlant
		if err := rows.Scan(&pp.Id, &pp.PlotId, &pp.PlantId, &pp.UserPlantId, &pp.Col, &pp.Row, &pp.CreatedAt, &pp.UpdatedAt, &pp.IsArchived, &pp.PlantName); err != nil {
			return nil, err
		}
		plotPlants = append(plotPlants, pp)
	}
	return plotPlants, nil
}

// ListArchivedForPlot returns the plot's history — plot_plants that have
// been archived (e.g. after harvest), most recently archived first.
func (r *Repository) ListArchivedForPlot(plotId int) ([]PlotPlant, error) {
	rows, err := r.DB.Query(context.Background(),
		`SELECT pp.id, pp.plot_id, pp.plant_id, pp.user_plant_id, pp.col, pp.row, pp.created_at, pp.updated_at, pp.is_archived,
		        COALESCE(p.name, up.name) AS plant_name
		 FROM plot_plants pp
		 LEFT JOIN plants p ON pp.plant_id = p.id
		 LEFT JOIN user_plants up ON pp.user_plant_id = up.id
		 WHERE pp.plot_id = $1 AND pp.is_archived
		 ORDER BY pp.updated_at DESC`,
		plotId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plotPlants []PlotPlant
	for rows.Next() {
		var pp PlotPlant
		if err := rows.Scan(&pp.Id, &pp.PlotId, &pp.PlantId, &pp.UserPlantId, &pp.Col, &pp.Row, &pp.CreatedAt, &pp.UpdatedAt, &pp.IsArchived, &pp.PlantName); err != nil {
			return nil, err
		}
		plotPlants = append(plotPlants, pp)
	}
	return plotPlants, nil
}

// FindByIdForUser resolves a plot_plant regardless of archived state — the
// timeline (and history views) must still be reachable after archiving.
func (r *Repository) FindByIdForUser(plotPlantId, userId int) (*PlotPlant, error) {
	var pp PlotPlant
	err := r.DB.QueryRow(context.Background(),
		`SELECT pp.id, pp.plot_id, pp.plant_id, pp.user_plant_id, pp.col, pp.row, pp.created_at, pp.updated_at, pp.is_archived,
		        COALESCE(p.name, up.name) AS plant_name
		 FROM plot_plants pp
		 JOIN plots pl ON pp.plot_id = pl.id
		 JOIN plot_users pu ON pl.id = pu.plot_id
		 LEFT JOIN plants p ON pp.plant_id = p.id
		 LEFT JOIN user_plants up ON pp.user_plant_id = up.id
		 WHERE pp.id = $1 AND pu.user_id = $2`,
		plotPlantId, userId,
	).Scan(&pp.Id, &pp.PlotId, &pp.PlantId, &pp.UserPlantId, &pp.Col, &pp.Row, &pp.CreatedAt, &pp.UpdatedAt, &pp.IsArchived, &pp.PlantName)
	if err != nil {
		return nil, err
	}
	return &pp, nil
}

// Archive marks a plot_plant as archived — freeing its cell for a new
// planting while keeping the row (and its timeline) around as history.
func (r *Repository) Archive(plotPlantId int) (*PlotPlant, error) {
	var pp PlotPlant
	err := r.DB.QueryRow(context.Background(),
		`UPDATE plot_plants
		 SET is_archived = true, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, plot_id, plant_id, user_plant_id, col, row, created_at, updated_at, is_archived`,
		plotPlantId,
	).Scan(&pp.Id, &pp.PlotId, &pp.PlantId, &pp.UserPlantId, &pp.Col, &pp.Row, &pp.CreatedAt, &pp.UpdatedAt, &pp.IsArchived)
	if err != nil {
		return nil, err
	}

	if pp.PlantId != nil {
		err = r.DB.QueryRow(context.Background(),
			`SELECT name FROM plants WHERE id = $1`, *pp.PlantId,
		).Scan(&pp.PlantName)
	} else {
		err = r.DB.QueryRow(context.Background(),
			`SELECT name FROM user_plants WHERE id = $1`, *pp.UserPlantId,
		).Scan(&pp.PlantName)
	}
	if err != nil {
		return nil, err
	}

	return &pp, nil
}

// RemoveFromCell hard-deletes the currently-active plot_plant at a cell.
// Archived rows at the same coordinates (past history) are left untouched.
func (r *Repository) RemoveFromCell(plotId, col, row int) error {
	_, err := r.DB.Exec(context.Background(),
		`DELETE FROM plot_plants WHERE plot_id = $1 AND col = $2 AND row = $3 AND NOT is_archived`,
		plotId, col, row,
	)
	return err
}
