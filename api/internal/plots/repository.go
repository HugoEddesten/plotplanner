package plots

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	DB *pgxpool.Pool
}

func (r *Repository) Create(name string, shape json.RawMessage) (int, error) {
	if shape == nil {
		shape = json.RawMessage("[]")
	}
	row := r.DB.QueryRow(context.Background(),
		`INSERT INTO plots (name, shape) VALUES ($1, $2) RETURNING id`, name, shape)

	var id int
	return id, row.Scan(&id)
}

func (r *Repository) AddUserToPlot(plotId, userId int) (int, error) {
	row := r.DB.QueryRow(context.Background(),
		`INSERT INTO plot_users (plot_id, user_id) VALUES ($1, $2) RETURNING id`, plotId, userId)

	var id int
	return id, row.Scan(&id)
}

func (r *Repository) FindByIdForUser(plotId, userId int) (*Plot, error) {
	var plot Plot
	err := r.DB.QueryRow(context.Background(), `
		SELECT p.id, p.name, p.shape, p.created_at, p.updated_at
		FROM plots p
		JOIN plot_users pu ON p.id = pu.plot_id
		WHERE p.id = $1 AND pu.user_id = $2
	`, plotId, userId).Scan(&plot.Id, &plot.Name, &plot.Shape, &plot.CreatedAt, &plot.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &plot, nil
}

func (r *Repository) UpdateShape(plotId, userId int, shape json.RawMessage) error {
	_, err := r.DB.Exec(context.Background(), `
		UPDATE plots p
		SET shape = $1, updated_at = NOW()
		FROM plot_users pu
		WHERE p.id = pu.plot_id
		  AND p.id = $2
		  AND pu.user_id = $3
	`, shape, plotId, userId)
	return err
}

func (r *Repository) ListByUserId(userId int) ([]Plot, error) {
	rows, err := r.DB.Query(context.Background(), `
		SELECT p.id, p.name, p.shape, p.created_at, p.updated_at
		FROM plots p
		JOIN plot_users pu ON p.id = pu.plot_id
		WHERE pu.user_id = $1
	`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plots []Plot
	for rows.Next() {
		var plot Plot
		if err := rows.Scan(&plot.Id, &plot.Name, &plot.Shape, &plot.CreatedAt, &plot.UpdatedAt); err != nil {
			return nil, err
		}
		plots = append(plots, plot)
	}

	return plots, nil
}
