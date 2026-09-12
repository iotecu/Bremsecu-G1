import os
import re
import subprocess
import click
from platformio.public import TestCase, TestRunnerBase, TestStatus, load_build_metadata

class CustomTestRunner(TestRunnerBase):
    EXPECTED_TEST_COUNT=4
    EXPECTED_ASSERTION_COUNT=25
    TEST_LINE_RE=re.compile(r"^TEST:\s+(?P<name>[A-Za-z0-9_]+)\s+\.\.\.\s+(?P<status>PASS|FAIL)\s*$")
    SUMMARY_RE=re.compile(r"^=== Results:\s+(?P<passed>\d+)/(?P<total>\d+)\s+test cases passed,\s+(?P<assertions>\d+)\s+assertions\s+===$")
    def _program(self):
        build_dir=self.project_config.get("platformio","build_dir")
        name="program.exe" if os.name=="nt" else "program"
        path=os.path.join(build_dir,self.test_suite.env_name,name)
        if os.path.exists(path): return path
        data=load_build_metadata(os.getcwd(),self.test_suite.env_name,cache=True)
        return data.get("prog_path",path) if data else path
    def _fail(self,name,msg,out):
        self.test_suite.add_case(TestCase(name=name,status=TestStatus.FAILED,message=msg,stdout=out))
    def stage_testing(self):
        p=subprocess.run([self._program()],capture_output=True,text=True,timeout=60,check=False)
        out=(p.stdout or "")+(p.stderr or "")
        if out: click.echo(out,nl=False)
        parsed=[]
        for line in out.splitlines():
            m=self.TEST_LINE_RE.match(line.strip())
            if not m: continue
            st=TestStatus.PASSED if m.group("status")=="PASS" else TestStatus.FAILED
            parsed.append((m.group("name"),st))
            self.test_suite.add_case(TestCase(name=m.group("name"),status=st,stdout=line))
        if p.returncode!=0:
            if not any(st==TestStatus.FAILED for _,st in parsed): self._fail("execution_failed",f"Executable exited with {p.returncode}",out)
            return
        summary=None
        for line in out.splitlines():
            m=self.SUMMARY_RE.match(line.strip())
            if m: summary=m; break
        if summary is None:
            self._fail("missing_summary","Battery monitor summary line missing",out); return
        passed=int(summary.group("passed")); total=int(summary.group("total")); assertions=int(summary.group("assertions"))
        if not(len(parsed)==self.EXPECTED_TEST_COUNT and passed==self.EXPECTED_TEST_COUNT and total==self.EXPECTED_TEST_COUNT and assertions==self.EXPECTED_ASSERTION_COUNT):
            self._fail("suite_count_mismatch",f"parsed={len(parsed)}, summary={passed}/{total}, assertions={assertions}; expected {self.EXPECTED_TEST_COUNT} tests/{self.EXPECTED_ASSERTION_COUNT} assertions",out)
