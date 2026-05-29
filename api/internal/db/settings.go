package db

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func applyPoolSettings(cfg *pgxpool.Config) {
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
}
