defualt:
  just -l
build:
  elm make src/Main.elm --output=public/main.js --optimize
clean:
  rm -rf elm-stuff
dev:
  open ./public/index.html
  air
