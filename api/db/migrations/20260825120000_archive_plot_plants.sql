-- +goose Up
ALTER TABLE plot_plants ALTER COLUMN is_archived SET NOT NULL;

ALTER TABLE plot_plants DROP CONSTRAINT plot_plants_plot_col_row_unique;

-- Only currently-active (non-archived) plot_plants compete for a cell —
-- archiving one frees its (plot_id, col, row) up for a new planting while
-- keeping the archived row (and its timeline) around as history.
CREATE UNIQUE INDEX plot_plants_active_cell_unique
  ON plot_plants (plot_id, col, row)
  WHERE NOT is_archived;

-- +goose Down
DROP INDEX plot_plants_active_cell_unique;

ALTER TABLE plot_plants
  ADD CONSTRAINT plot_plants_plot_col_row_unique UNIQUE (plot_id, col, row);

ALTER TABLE plot_plants ALTER COLUMN is_archived DROP NOT NULL;
