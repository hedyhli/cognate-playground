# List options
defualt:
  just -l

# `elm make` --> public/main.js
build:
  elm make src/Main.elm --output=public/main.js --optimize

# Force-remove cache dirs
clean:
  rm -rf elm-stuff

# Open public/index.html in the browser and run `air`
dev:
  open ./public/index.html
  air
