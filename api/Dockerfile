# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o api ./cmd/api/main.go

# Run stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/api .

EXPOSE 3000

CMD ["./api", "--auto-migrate"]