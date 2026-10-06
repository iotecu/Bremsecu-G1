import os
import re
import subprocess

import click
from platformio.public import TestCase, TestRunnerBase, TestStatus, load_build_metadata


class CustomTestRunner(TestRunnerBase):
    EXPECTED_TEST_COUNT = 10
    EXPECTED_ASSERTION_COUNT = 25

    TEST_LINE_RE = re.compile(
        r"^TEST:\s+(?P<name>[A-Za-z0-9_]+)\s+\.\.\.\s+(?P<status>PASS|FAIL)\s*$"
    )
    SUMMARY_RE = re.compile(
        r"^=== Results:\s+(?P<passed>\d+)/(?P<total>\d+)\s+test cases passed,\s+"
        r"(?P<assertions>\d+)\s+assertions\s+===$"
    )

    def _get_program_path(self):
        build_dir = self.project_config.get("platformio", "build_dir")
        program_name = "program.exe" if os.name == "nt" else "program"
        program_path = os.path.join(build_dir, self.test_suite.env_name, program_name)
        if os.path.exists(program_path):
            return program_path
        build_data = load_build_metadata(os.getcwd(), self.test_suite.env_name, cache=True)
        if build_data and build_data.get("prog_path"):
            return build_data["prog_path"]
        return program_path

    def _add_failure(self, name, message, output):
        self.test_suite.add_case(
            TestCase(name=name, status=TestStatus.FAILED, message=message, stdout=output)
        )

    def stage_testing(self):
        completed = subprocess.run(
            [self._get_program_path()], capture_output=True, text=True,
            timeout=60, check=False
        )
        output = (completed.stdout or "") + (completed.stderr or "")
        if output:
            click.echo(output, nl=False)

        parsed = []
        for line in output.splitlines():
            match = self.TEST_LINE_RE.match(line.strip())
            if not match:
                continue
            status = TestStatus.PASSED if match.group("status") == "PASS" else TestStatus.FAILED
            parsed.append((match.group("name"), status))
            self.test_suite.add_case(
                TestCase(name=match.group("name"), status=status, stdout=line)
            )

        if completed.returncode != 0:
            if not any(status == TestStatus.FAILED for _, status in parsed):
                self._add_failure("execution_failed", f"Executable exited with {completed.returncode}", output)
            return

        summary = None
        for line in output.splitlines():
            match = self.SUMMARY_RE.match(line.strip())
            if match:
                summary = match
                break

        if summary is None:
            self._add_failure("missing_summary", "Package 4 summary line missing", output)
            return

        passed = int(summary.group("passed"))
        total = int(summary.group("total"))
        assertions = int(summary.group("assertions"))
        if not (
            len(parsed) == self.EXPECTED_TEST_COUNT
            and passed == self.EXPECTED_TEST_COUNT
            and total == self.EXPECTED_TEST_COUNT
            and assertions == self.EXPECTED_ASSERTION_COUNT
        ):
            self._add_failure(
                "suite_count_mismatch",
                f"parsed={len(parsed)}, summary={passed}/{total}, assertions={assertions}; "
                f"expected {self.EXPECTED_TEST_COUNT} tests/{self.EXPECTED_ASSERTION_COUNT} assertions",
                output,
            )
