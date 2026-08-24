package plants

import "time"

type Plant struct {
	Id        int       `json:"id"`
	Name      string    `json:"name"`
	Source    string    `json:"source"` // "global" or "user"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserPlant struct {
	Id        int       `json:"id"`
	UserId    int       `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type PlotPlant struct {
	Id          int       `json:"id"`
	PlotId      int       `json:"plot_id"`
	Col         int       `json:"col"`
	Row         int       `json:"row"`
	PlantId     *int      `json:"plant_id"`
	UserPlantId *int      `json:"user_plant_id"`
	PlantName   string    `json:"plant_name"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PlantPlotRequest struct {
	PlantId *int   `json:"plant_id"`
	Name    string `json:"name"`
	Col     int    `json:"col"`
	Row     int    `json:"row"`
}
