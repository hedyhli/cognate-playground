# List options
default:
  @just -l

# `elm make` --> public/main.js
build:
  elm make src/Main.elm --output=public/elm.js --optimize
  cat public/elm.js public/append.js > public/main.js
  rm public/elm.js

# Force-remove generated files
clean:
  rm -rf elm-stuff
  rm public/main.js

# Open public/index.html in the browser and run `air`
dev:
  open ./public/index.html
  air

# Run rsync
deploy:
  rsync -rv public/index.html public/main.js pgs.sh:/cognate-playground
