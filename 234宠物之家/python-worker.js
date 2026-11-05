"use strict";

const runtimeURL = new URL("./vendor/pyodide/", self.location.href).href;
let runtime;
async function loadRuntime() {
  importScripts(runtimeURL + "pyodide.js");
  return loadPyodide({indexURL: runtimeURL});
}

const execute = String.raw`
import contextlib, io, json, traceback
from contextlib import redirect_stdout, redirect_stderr

class Output(io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 16000:
            raise ValueError("输出超过限制，请检查循环")
        return super().write(text)

def evaluate(source, given, expected, function):
    scope = {"__name__": "__main__"}
    if not function and isinstance(given, dict):
        scope.update(given)
    stream = io.StringIO(given + "\n" if isinstance(given, str) else "")
    def read_input(prompt=""):
        if prompt:
            print(prompt, end="")
        line = stream.readline()
        if not line:
            raise EOFError("输入已读完，请检查输入行数")
        return line.rstrip("\n")
    scope["input"] = read_input
    output = Output()
    try:
        with redirect_stdout(output), redirect_stderr(output):
            exec(compile(source, "练习.py", "exec"), scope)
            if function:
                value = scope[function](*given)
            else:
                value = output.getvalue().rstrip("\n")
        if function:
            correct = value == expected and (not isinstance(expected, bool) or type(value) is bool)
            display = repr(value)
        else:
            correct = value == expected
            display = value
        return dict(ok=correct, actual=display[:16000], log=output.getvalue() if function else "")
    except Exception as exc:
        detail = traceback.TracebackException.from_exception(exc)
        detail.stack = traceback.StackSummary.from_list([f for f in detail.stack if f.filename == "练习.py"])
        return dict(ok=False, error="".join(detail.format()).strip(), log=output.getvalue())

def run_batch(payload):
    job = json.loads(payload)
    results = []
    for given, expected in job["cases"]:
        result = evaluate(job["source"], given, expected, job.get("call"))
        results.append(result)
        if job["grade"] and not result["ok"]:
            break
    return json.dumps(results, ensure_ascii=False)
`;

self.onmessage = async ({data}) => {
  try {
    runtime ||= loadRuntime();
    const python = await runtime;
    self.postMessage({running: true});
    python.globals.set("job_json", JSON.stringify(data));
    const json = python.runPython(execute + "\nrun_batch(job_json)");
    self.postMessage({results: JSON.parse(json)});
  } catch (error) {
    self.postMessage({error: String(error)});
  }
};
