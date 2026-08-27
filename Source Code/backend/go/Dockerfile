FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY *.go ./
COPY go.mod ./
RUN CGO_ENABLED=0 go build -o /go-backend .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /go-backend /usr/local/bin/go-backend
EXPOSE 3003
CMD ["go-backend"]
