package timeline

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	DB *pgxpool.Pool
}

func (r *Repository) Create(plotPlantId int, eventType string, eventDate time.Time, notes *string) (*Entry, error) {
	var e Entry
	err := r.DB.QueryRow(context.Background(),
		`INSERT INTO plant_timeline (plot_plant_id, event_type, event_date, notes)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, plot_plant_id, event_type, event_date, notes, created_at, updated_at`,
		plotPlantId, eventType, eventDate, notes,
	).Scan(&e.Id, &e.PlotPlantId, &e.EventType, &e.EventDate, &e.Notes, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) ListForPlotPlant(plotPlantId int) ([]Entry, error) {
	rows, err := r.DB.Query(context.Background(),
		`SELECT id, plot_plant_id, event_type, event_date, notes, created_at, updated_at
		 FROM plant_timeline
		 WHERE plot_plant_id = $1
		 ORDER BY event_date DESC, id DESC`,
		plotPlantId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.Id, &e.PlotPlantId, &e.EventType, &e.EventDate, &e.Notes, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ListForPlot returns the most recent timeline entries across every
// plot_plant in a plot (active or archived) — the plot-wide activity feed.
func (r *Repository) ListForPlot(plotId, limit int) ([]FeedEntry, error) {
	rows, err := r.DB.Query(context.Background(),
		`SELECT t.id, t.plot_plant_id, t.event_type, t.event_date, t.notes, t.created_at, t.updated_at,
		        COALESCE(p.name, up.name) AS plant_name, pp.col, pp.row, pp.is_archived
		 FROM plant_timeline t
		 JOIN plot_plants pp ON pp.id = t.plot_plant_id
		 LEFT JOIN plants p ON pp.plant_id = p.id
		 LEFT JOIN user_plants up ON pp.user_plant_id = up.id
		 WHERE pp.plot_id = $1
		 ORDER BY t.event_date DESC, t.id DESC
		 LIMIT $2`,
		plotId, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []FeedEntry
	for rows.Next() {
		var e FeedEntry
		if err := rows.Scan(
			&e.Id, &e.PlotPlantId, &e.EventType, &e.EventDate, &e.Notes, &e.CreatedAt, &e.UpdatedAt,
			&e.PlantName, &e.Col, &e.Row, &e.IsArchived,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// Update replaces event_type and notes, and updates event_date only when a
// non-nil value is supplied (nil keeps the existing event_date).
func (r *Repository) Update(id, plotPlantId int, eventType string, eventDate *time.Time, notes *string) (*Entry, error) {
	var e Entry
	err := r.DB.QueryRow(context.Background(),
		`UPDATE plant_timeline
		 SET event_type = $1,
		     event_date = COALESCE($2, event_date),
		     notes = $3,
		     updated_at = NOW()
		 WHERE id = $4 AND plot_plant_id = $5
		 RETURNING id, plot_plant_id, event_type, event_date, notes, created_at, updated_at`,
		eventType, eventDate, notes, id, plotPlantId,
	).Scan(&e.Id, &e.PlotPlantId, &e.EventType, &e.EventDate, &e.Notes, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) Delete(id, plotPlantId int) error {
	cmd, err := r.DB.Exec(context.Background(),
		`DELETE FROM plant_timeline WHERE id = $1 AND plot_plant_id = $2`,
		id, plotPlantId,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
