-- +goose Up
CREATE TABLE plant_timeline (
  id SERIAL PRIMARY KEY,
  plot_plant_id INTEGER NOT NULL REFERENCES plot_plants(id) ON DELETE CASCADE,
  event_type VARCHAR(255) NOT NULL,
  event_date TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE plot_plants ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- +goose Down
DROP TABLE plant_timeline;

ALTER TABLE plot_plants
  DROP COLUMN is_archived;
