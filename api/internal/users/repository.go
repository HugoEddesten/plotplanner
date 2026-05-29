package users

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

func (r *Repository) FindByEmail(email string) (*User, error) {
	row := r.DB.QueryRow(context.Background(),
		`SELECT id, email, password_hash FROM users WHERE email = $1`, email)

	u := User{}
	err := row.Scan(&u.Id, &u.Email, &u.PasswordHash)
	return &u, err
}

func (r *Repository) Create(email, passwordHash string) (int, error) {
	row := r.DB.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
		email, passwordHash)

	var id int
	return id, row.Scan(&id)
}

func (r *Repository) CreatePasswordReset(userId int) (*PasswordReset, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(15 * time.Minute)

	var model PasswordReset
	err = r.DB.QueryRow(context.Background(), `
		INSERT INTO password_resets (user_id, token, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, token, expires_at, used_at, created_at
		`, userId, token, expiresAt).Scan(
		&model.Id, &model.UserId, &model.Token, &model.ExpiresAt, &model.UsedAt, &model.CreatedAt,
	)

	return &model, nil
}

func (r *Repository) FindPasswordResetByToken(token string) (*PasswordReset, error) {
	var model PasswordReset
	err := r.DB.QueryRow(context.Background(), `
		SELECT id, user_id, token, expires_at, used_at, created_at
		FROM password_resets
		WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
	`, token).Scan(
		&model.Id, &model.UserId, &model.Token, &model.ExpiresAt, &model.UsedAt, &model.CreatedAt,
	)
	return &model, err
}

func (r *Repository) ConsumePasswordReset(resetId int, userId int, newPasswordHash string) error {
	tx, err := r.DB.Begin(context.Background())
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())

	_, err = tx.Exec(context.Background(),
		`UPDATE password_resets SET used_at = NOW() WHERE id = $1`, resetId)
	if err != nil {
		return err
	}

	_, err = tx.Exec(context.Background(),
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, newPasswordHash, userId)
	if err != nil {
		return err
	}

	return tx.Commit(context.Background())
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
