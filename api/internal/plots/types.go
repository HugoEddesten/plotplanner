package plots

import (
	"encoding/json"
	"time"
)

type CreatePlotRequest struct {
	Name  string          `json:"name"`
	Shape json.RawMessage `json:"shape,omitempty"`
}

type InviteRequest struct {
	Email string `json:"email"`
}

type UpdateShapeRequest struct {
	Shape json.RawMessage `json:"shape"`
}

// Point represents a single vertex of a plot's polygon boundary.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Plot struct {
	Id        int             `json:"id"`
	Name      string          `json:"name"`
	Shape     json.RawMessage `json:"shape"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type PlotUser struct {
	Id        int       `json:"id"`
	PlotId    int       `json:"plot_id"`
	UserId    int       `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
