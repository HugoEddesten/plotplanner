package invites

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	DB *pgxpool.Pool
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (r *Repository) Create(ctx context.Context, plotId, invitedBy int, email string) (*PlotInvite, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	var inv PlotInvite
	err = r.DB.QueryRow(ctx, `
		INSERT INTO plot_invites (plot_id, invited_by, email, token, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, plot_id, invited_by, email, token, expires_at, accepted_at, declined_at, created_at
	`, plotId, invitedBy, email, token, expiresAt).Scan(
		&inv.Id, &inv.PlotId, &inv.InvitedBy, &inv.Email,
		&inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.DeclinedAt, &inv.CreatedAt,
	)

	return &inv, err
}

func (r *Repository) FindByToken(ctx context.Context, token string) (*PlotInvite, error) {
	var inv PlotInvite
	err := r.DB.QueryRow(ctx, `
		SELECT id, plot_id, invited_by, email, token, expires_at, accepted_at, declined_at, created_at
		FROM plot_invites
		WHERE token = $1
	`, token).Scan(
		&inv.Id, &inv.PlotId, &inv.InvitedBy, &inv.Email,
		&inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.DeclinedAt, &inv.CreatedAt,
	)
	return &inv, err
}

func (r *Repository) FindInfoByToken(ctx context.Context, token string) (*InviteInfoResponse, error) {
	var info InviteInfoResponse
	err := r.DB.QueryRow(ctx, `
		SELECT pi.email, p.name, pi.token
		FROM plot_invites pi
		JOIN plots p ON p.id = pi.plot_id
		WHERE pi.token = $1
		  AND pi.accepted_at IS NULL
		  AND pi.declined_at IS NULL
		  AND pi.expires_at > NOW()
	`, token).Scan(&info.Email, &info.PlotName, &info.Token)
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (r *Repository) FindPendingByEmail(ctx context.Context, email string) ([]PlotInvite, error) {
	rows, err := r.DB.Query(ctx, `
		SELECT id, plot_id, invited_by, email, token, expires_at, accepted_at, declined_at, created_at
		FROM plot_invites
		WHERE email = $1
		  AND accepted_at IS NULL
		  AND declined_at IS NULL
		  AND expires_at > NOW()
	`, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []PlotInvite
	for rows.Next() {
		var inv PlotInvite
		if err := rows.Scan(
			&inv.Id, &inv.PlotId, &inv.InvitedBy, &inv.Email,
			&inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.DeclinedAt, &inv.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, inv)
	}
	return result, rows.Err()
}

func (r *Repository) FindPendingByPlot(ctx context.Context, plotId int) ([]PlotInvite, error) {
	rows, err := r.DB.Query(ctx, `
		SELECT id, plot_id, invited_by, email, token, expires_at, accepted_at, declined_at, created_at
		FROM plot_invites
		WHERE plot_id = $1
		  AND accepted_at IS NULL
		  AND declined_at IS NULL
		  AND expires_at > NOW()
		ORDER BY created_at DESC
	`, plotId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []PlotInvite
	for rows.Next() {
		var inv PlotInvite
		if err := rows.Scan(
			&inv.Id, &inv.PlotId, &inv.InvitedBy, &inv.Email,
			&inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.DeclinedAt, &inv.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, inv)
	}
	return result, rows.Err()
}

func (r *Repository) Accept(ctx context.Context, id int) error {
	_, err := r.DB.Exec(ctx, `
		UPDATE plot_invites SET accepted_at = NOW() WHERE id = $1
	`, id)
	return err
}

func (r *Repository) Decline(ctx context.Context, id int) error {
	_, err := r.DB.Exec(ctx, `
		UPDATE plot_invites SET declined_at = NOW() WHERE id = $1
	`, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int) error {
	_, err := r.DB.Exec(ctx, `DELETE FROM plot_invites WHERE id = $1`, id)
	return err
}
