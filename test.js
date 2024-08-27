import {Runner, initPrelude, setPreludeReady, initTS, mockFrontend} from "./cognate.js";

import * as fs from "fs"
import * as path from "path"
import {fileURLToPath} from "url"
import * as assert from "assert"

const dir = path.dirname(fileURLToPath(import.meta.url));
const prelude = fs.readFileSync(path.join(dir, "public", "prelude.cog"), "utf8");
const testsDir = path.join(dir, "tests");

await initTS();
initPrelude(prelude);
setPreludeReady();

describe("runner", () => {
  let out = '';
  let err = '';
  let r = new Runner({
    ...mockFrontend,
    output: {
      add(s) {out += s.value},
      newline() {out += "\n"},
      clear () {out = ''},
    },
    errors: {
      add(s) {err += s},
      redraw() {},
      clear() {err = ''},
      hasAny() { return err != ''; },
    }
  });

  it("hello world", () => {
    r.tree = undefined;
    r.run(`Print "hello world";`);
    assert.equal(out, "hello world\n");
    assert.equal(err, '');
  });

  for (let file of fs.readdirSync(testsDir)) {
    if (!/\.cog$/.test(file)) continue
    let name = /^[^\.]*/.exec(file)[0]
    it(name, () => {
      r.tree = undefined;
      out = '';
      err = '';
      const code = fs.readFileSync(path.join(testsDir, file), 'utf8');
      r.run(code);
      assert.equal(err, '');
      if (out != '') {
        for (let line of out.split('\n')) {
          if (line != '') {
            if (line.startsWith("XFAIL")) {
              console.log(line);
            } else {
              assert.match(line, /^PASS:/);
            }
          }
        }
      }
    });
  }

  it("begin error", () => {
    r.tree = undefined;
    out = '';
    err = '';
    r.run(`
        Begin ();
        Do;
      `);
    assert.match(err, /^in Do:.*Begin/);
  });

  it("nested begin error", () => {
    r.tree = undefined;
    out = '';
    err = '';
    r.run(`
      Begin (
        Begin ();
        Do;
      );
      `);
    assert.match(err, /^in Begin: in Do:.*Begin/);
  });
});
