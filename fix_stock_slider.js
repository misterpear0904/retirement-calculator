const fs = require('fs');
const content = fs.readFileSync('src/components/BasicModeInputs.tsx', 'utf8');

const oldStr = `<input
              id="basic-mix"
              type="range"
              min={0}
              max={95}
              value={state.stockPct}
              onChange={(e) => {
                const stock = parseInt(e.target.value);
                onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
              }}
              className="w-full cursor-pointer"
            />`;

const newStr = `<input
              id="basic-mix"
              type="range"
              min={0}
              max={95}
              value={state.stockPct}
              onChange={(e) => {
                const stock = parseInt(e.target.value);
                onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const stock = Math.min(95, state.stockPct + 5);
                  onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const stock = Math.max(0, state.stockPct - 5);
                  onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
                }
              }}
              aria-valuetext={\`$\{state.stockPct}% stocks\`}
              className="w-full cursor-pointer"
            />`;

const newContent = content.replace(oldStr, newStr);
fs.writeFileSync('src/components/BasicModeInputs.tsx', newContent);
console.log('Done');