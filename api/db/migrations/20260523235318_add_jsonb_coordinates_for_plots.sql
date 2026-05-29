-- +goose Up
ALTER TABLE plots ADD COLUMN shape JSONB NOT NULL DEFAULT '[]';

-- +goose Down
ALTER TABLE plots DROP COLUMN shape;
