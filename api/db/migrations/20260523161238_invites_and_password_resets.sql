-- +goose Up
-- Plot invites table
CREATE TABLE plot_invites (
    id          SERIAL PRIMARY KEY,
    plot_id    INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    invited_by  INTEGER NOT NULL REFERENCES users(id),
    email       TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plot_invites_token ON plot_invites(token);
CREATE INDEX idx_plot_invites_email ON plot_invites(email);

-- User password reset requests
CREATE TABLE password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at    TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_resets_token ON password_resets(token);

-- +goose Down
DROP TABLE plot_invites;
DROP TABLE password_resets;
