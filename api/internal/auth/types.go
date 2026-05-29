package auth

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SendResetPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
}
