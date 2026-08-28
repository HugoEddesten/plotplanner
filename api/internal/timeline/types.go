package timeline

import "time"

type EventType string

const (
	EventPlanted     EventType = "planted"
	EventGerminated  EventType = "germinated"
	EventWatered     EventType = "watered"
	EventFertilized  EventType = "fertilized"
	EventPruned      EventType = "pruned"
	EventPestDisease EventType = "pest_disease"
	EventHarvested   EventType = "harvested"
	EventRemoved     EventType = "removed"
	EventComment     EventType = "comment"
)

var validEventTypes = map[EventType]bool{
	EventPlanted:     true,
	EventGerminated:  true,
	EventWatered:     true,
	EventFertilized:  true,
	EventPruned:      true,
	EventPestDisease: true,
	EventHarvested:   true,
	EventRemoved:     true,
	EventComment:     true,
}

func (e EventType) Valid() bool { return validEventTypes[e] }

type Entry struct {
	Id          int       `json:"id"`
	PlotPlantId int       `json:"plot_plant_id"`
	EventType   string    `json:"event_type"`
	EventDate   time.Time `json:"event_date"`
	Notes       *string   `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// FeedEntry is a timeline entry annotated with its plant's identity — used
// by the plot-wide activity feed, where entries span many plot_plants.
type FeedEntry struct {
	Entry
	PlantName  string `json:"plant_name"`
	Col        int    `json:"col"`
	Row        int    `json:"row"`
	IsArchived bool   `json:"is_archived"`
}

type CreateEntryRequest struct {
	EventType string     `json:"event_type"`
	EventDate *time.Time `json:"event_date"`
	Notes     *string    `json:"notes"`
}

type UpdateEntryRequest struct {
	EventType string     `json:"event_type"`
	EventDate *time.Time `json:"event_date"`
	Notes     *string    `json:"notes"`
}
