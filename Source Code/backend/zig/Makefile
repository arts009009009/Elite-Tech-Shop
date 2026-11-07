.PHONY: build run watch clean test

ZIG ?= zig
BUILD_MODE ?= Debug

build:
	$(ZIG) build -Doptimize=$(BUILD_MODE)

run: build
	./zig-out/bin/zig-platform

watch:
	./watch.sh

clean:
	rm -rf zig-out zig-cache

test:
	$(ZIG) build test
