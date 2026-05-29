package invites

import "time"

type PlotInvite struct {
	Id         int
	PlotId     int
	InvitedBy  int
	Email      string
	Token      string
	ExpiresAt  time.Time
	AcceptedAt *time.Time
	DeclinedAt *time.Time
	CreatedAt  time.Time
}

type InviteInfoResponse struct {
	Email    string `json:"email"`
	PlotName string `json:"plotName"`
	Token    string `json:"token"`
}
