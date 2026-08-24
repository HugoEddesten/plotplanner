-- +goose Up
CREATE TABLE plants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_plants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE plot_plants DROP COLUMN plant_id;

ALTER TABLE plot_plants
  ADD COLUMN plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  ADD COLUMN user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE SET NULL,
  ADD COLUMN col INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN row INTEGER NOT NULL DEFAULT 0;

ALTER TABLE plot_plants ALTER COLUMN col DROP DEFAULT;
ALTER TABLE plot_plants ALTER COLUMN row DROP DEFAULT;

ALTER TABLE plot_plants
  ADD CONSTRAINT plot_plants_one_plant_check CHECK (
    (plant_id IS NOT NULL)::int + (user_plant_id IS NOT NULL)::int = 1
  ),
  ADD CONSTRAINT plot_plants_plot_col_row_unique UNIQUE (plot_id, col, row);

-- +goose Down
ALTER TABLE plot_plants
  DROP CONSTRAINT plot_plants_plot_col_row_unique,
  DROP CONSTRAINT plot_plants_one_plant_check;

ALTER TABLE plot_plants
  DROP COLUMN col,
  DROP COLUMN row,
  DROP COLUMN user_plant_id,
  DROP COLUMN plant_id;

ALTER TABLE plot_plants ADD COLUMN plant_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plot_plants ALTER COLUMN plant_id DROP DEFAULT;

DROP TABLE user_plants;
DROP TABLE plants;
