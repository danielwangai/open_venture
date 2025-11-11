.PHONY: build clean deploy test

build:
	anchor build

clean:
	anchor clean

deploy:
	anchor deploy

test:
	anchor test

