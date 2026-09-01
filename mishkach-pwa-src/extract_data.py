"""extract_data.py — generate /data/*.json from the source-of-truth JSX files.

Used by build.py (called BEFORE the main JSX concat) so the JSON snapshots
that the runtime loader fetches stay in sync with the JSX source. We keep
the data IN the JSX files (rather than a separate authoring format) so
contributors edit one canonical place — but the runtime loads it via
fetch() so the initial bundle stays small (v3.20: ~250 KB savings).

Approach:
  1. esbuild compiles each source .jsx → CJS JS targeting Node 18
     (no bundling — we just want JSX → React.createElement transforms +
     ESM → CJS so a Node script can require() it).
  2. esbuild --banner injects stubs for things that exist in the browser
     bundle (React, T, fmt, useStore, ...) so module-level statements that
     reference those don't crash during Node evaluation.
  3. We append `process.stdout.write(JSON.stringify({c1, c2}))` to the
     compiled file, run it via Node, and capture the JSON for each
     declared const.
  4. Write to /data/<name>.json (relative to repo root).

This is build-only — Pillow / python-bidi style; users running the PWA
never see Python or this script.
"""
import json
import os
import subprocess
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SRC, '..'))
ESBUILD = os.path.join(SRC, 'node_modules', 'esbuild', 'bin', 'esbuild')

# npm installs `node_modules/esbuild/bin/esbuild` either as a JS shim (run it
# with node) or, on some platforms, as the native binary itself (run it
# directly). Sniffing the ELF/Mach-O/PE magic makes the build work on both
# without the caller caring which one npm produced.
def esbuild_argv(esbuild_path):
    try:
        with open(esbuild_path, 'rb') as _fp:
            magic = _fp.read(4)
    except OSError:
        return ['node', esbuild_path]
    is_native = (
        magic[:4] == b'\x7fELF' or                       # Linux
        magic[:4] in (b'\xcf\xfa\xed\xfe', b'\xca\xfe\xba\xbe') or  # macOS
        magic[:2] == b'MZ'                               # Windows
    )
    return [esbuild_path] if is_native else ['node', esbuild_path]


# Browser globals that the JSX files reference at module load time.
# Stub them to no-op values so Node can evaluate the file without crashing.
# The data we extract sits in pure consts that don't depend on these — but
# the file may *also* declare functions / components that reference them.
# Functions don't execute at module load, so their references are fine.
NODE_BANNER = (
    'const React={createElement:()=>null,Fragment:"F",useState:()=>[null,()=>{}],'
    'useEffect:()=>{},useRef:()=>({current:null}),useMemo:(f)=>f(),useCallback:(f)=>f(),'
    'useContext:()=>null,useReducer:()=>[null,()=>{}],useId:()=>"id",useSyncExternalStore:()=>null};'
    'const T={},fmt={},useStore=()=>({state:{},dispatch:()=>{},stats:{}}),useToast=()=>(()=>{}),'
    'addDaysISO=()=>"",todayISO=()=>"",nowHHMM=()=>"",daysBetweenISO=()=>0,parseDOWFromISO=()=>0,'
    'uid=()=>"",holidaysInRange=()=>[],EXERCISE_CATALOG=[];'
)

def _run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8')

def extract_consts(jsx_filename, const_names, out_filename):
    """Run a JSX source file through esbuild + Node to capture the named
    top-level consts as JSON. Returns the size (bytes) of the written file.
    `out_filename` is relative to the repo's /data/ directory.
    """
    if not os.path.exists(ESBUILD):
        sys.stderr.write(f"✗ esbuild not found at {ESBUILD}\n  Run: cd mishkach-pwa-src && npm install\n")
        sys.exit(1)
    src_path = os.path.join(SRC, jsx_filename)
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source not found: {src_path}")

    src = open(src_path, 'r', encoding='utf-8').read()
    obj_lit = (
        '{' +
        ','.join(f'{n}:typeof {n}!=="undefined"?{n}:null' for n in const_names) +
        '}'
    )
    appended = src + f'\nprocess.stdout.write(JSON.stringify({obj_lit}));\n'

    with tempfile.TemporaryDirectory() as tmp:
        in_jsx = os.path.join(tmp, 'in.jsx')
        out_cjs = os.path.join(tmp, 'out.cjs')
        with open(in_jsx, 'w', encoding='utf-8') as fp:
            fp.write(appended)

        # esbuild: JSX → CJS, with stubs banner so unresolved globals don't crash
        bres = _run([
            *esbuild_argv(ESBUILD), in_jsx,
            '--target=node18',
            '--platform=node',
            '--format=cjs',
            '--banner:js=' + NODE_BANNER,
            '--outfile=' + out_cjs,
        ])
        if bres.returncode != 0:
            sys.stderr.write(f"✗ esbuild failed for {jsx_filename}\n{bres.stderr}\n")
            sys.exit(bres.returncode)

        # Now actually run the compiled file
        nres = _run(['node', out_cjs])
        if nres.returncode != 0:
            sys.stderr.write(f"✗ node eval failed for {jsx_filename}\n{nres.stderr}\n")
            sys.exit(nres.returncode)
        try:
            payload = json.loads(nres.stdout)
        except Exception as e:
            sys.stderr.write(f"✗ json parse failed for {jsx_filename}: {e}\nstdout head: {nres.stdout[:300]}\n")
            sys.exit(1)

    # If only one const, save its value at the JSON root (cleaner consumer code).
    # If multiple, save the dict of {name: value, ...}.
    final = payload[const_names[0]] if len(const_names) == 1 else payload
    out_dir = os.path.join(ROOT, 'data')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, out_filename)
    # separators=(',', ':') = no extra spaces — minify the JSON since
    # users see it as Hebrew strings either way; whitespace is dead weight.
    with open(out_path, 'w', encoding='utf-8') as fp:
        json.dump(final, fp, ensure_ascii=False, separators=(',', ':'))

    return os.path.getsize(out_path)

def main():
    """Source-of-truth files are *.data.jsx — these are NEVER in JSX_FILES
    and never ship in the runtime bundle. Edit them when adding tips,
    strings, or prompts; the extractor sees the changes on the next build.
    """
    print('--- extracting data files ---')
    sizes = {}
    sizes['tips-creative.json'] = extract_consts(
        '16-tips-creative.data.jsx',
        ['CREATIVE_TIPS'],
        'tips-creative.json',
    )
    sizes['strings.json'] = extract_consts(
        '18-strings.data.jsx',
        ['STRINGS'],
        'strings.json',
    )
    sizes['ai-prompts.json'] = extract_consts(
        '20-ai-prompts.data.jsx',
        [
            'AI_PROMPTS',
            'AUTO_CORRELATIONS_PROMPT',
            'WHAT_IF_SCENARIOS_PROMPT',
            'MONTHLY_RECAP_PROMPT',
            'WEEKLY_INSIGHT_STRUCT_PROMPT',
            'WORKOUT_VOICE_PARSER_PROMPT',
            'WORKOUT_PLAN_GENERATOR_PROMPT',
            'REPORT_INSIGHTS_SYSTEM_PROMPT',
            'EXPERIENCE_LABELS_HE',
            'LOCATION_LABELS_HE',
            'GOAL_LABELS_HE',
            'LIMITATION_LABELS_HE',
        ],
        'ai-prompts.json',
    )
    for name, sz in sizes.items():
        kb = sz // 1024 if sz >= 1024 else 0
        print(f'  + data/{name:24s} {kb:>5d} KB')
    return sizes

if __name__ == '__main__':
    main()
