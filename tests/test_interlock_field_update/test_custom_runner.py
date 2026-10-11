# =============================================================================
# BREMSECU G1 REV-2 - Package 1 custom PlatformIO test runner
# Converts the existing printf/exit C++ harness output into PlatformIO TestCase
# results without changing the accepted Package 1 test logic.
# =============================================================================

import os
import re
import subprocess

import click
from platformio.public import TestCase, TestRunnerBase, TestStatus, load_build_metadata


class CustomTestRunner(TestRunnerBase):
    """PlatformIO runner for the Package 1 native interlock suite."""

    EXPECTED_TEST_COUNT = 13
    EXPECTED_ASSERTION_COUNT = 55

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
        program_path = os.path.join(
            build_dir, self.test_suite.env_name, program_name
        )

        if os.path.exists(program_path):
            return program_path

        build_data = load_build_metadata(
            os.getcwd(), self.test_suite.env_name, cache=True
        )
        if build_data and build_data.get("prog_path"):
            return build_data["prog_path"]

        return program_path

    def _failure_details(self, lines, index):
        details = []
        for line in lines[index + 1 :]:
            stripped = line.strip()
            if stripped.startswith("TEST:") or stripped.startswith("=== Results:"):
                break
            if stripped:
                details.append(stripped)
            if len(details) == 2:
                break
        return " | ".join(details) or "Test failed"

    def _add_runner_failure(self, name, message, output):
        self.test_suite.add_case(
            TestCase(
                name=name,
                status=TestStatus.FAILED,
                message=message,
                stdout=output,
            )
        )

    def stage_testing(self):
        program_path = self._get_program_path()
        command = [program_path]
        if self.options.program_args:
            command.extend(self.options.program_args)

        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        output = (completed.stdout or "") + (completed.stderr or "")
        if output:
            click.echo(output, nl=False)

        lines = output.splitlines()
        parsed_cases = []
        seen_names = set()

        for index, line in enumerate(lines):
            match = self.TEST_LINE_RE.match(line.strip())
            if not match:
                continue

            test_name = match.group("name")
            status_text = match.group("status")
            status = (
                TestStatus.PASSED if status_text == "PASS" else TestStatus.FAILED
            )
            message = (
                None
                if status == TestStatus.PASSED
                else self._failure_details(lines, index)
            )

            if test_name in seen_names:
                self._add_runner_failure(
                    "duplicate_test_name",
                    f"Duplicate test result detected: {test_name}",
                    output,
                )
                continue

            seen_names.add(test_name)
            parsed_cases.append((test_name, status))
            self.test_suite.add_case(
                TestCase(
                    name=test_name,
                    status=status,
                    message=message,
                    stdout=line,
                )
            )

        if not parsed_cases:
            self._add_runner_failure(
                "no_tests_detected",
                "Test executable produced no parseable Package 1 test cases.",
                output,
            )
            return

        failed_cases = [
            name for name, status in parsed_cases if status == TestStatus.FAILED
        ]

        if completed.returncode != 0:
            if not failed_cases:
                self._add_runner_failure(
                    "execution_failed",
                    f"Test executable exited with code {completed.returncode} "
                    "without a parseable FAIL result.",
                    output,
                )
            return

        if failed_cases:
            self._add_runner_failure(
                "runner_consistency",
                "Test executable returned exit code 0 despite one or more FAIL results.",
                output,
            )
            return

        summary_match = None
        for line in lines:
            summary_match = self.SUMMARY_RE.match(line.strip())
            if summary_match:
                break

        if not summary_match:
            self._add_runner_failure(
                "missing_summary",
                "Test executable returned success without the Package 1 summary line.",
                output,
            )
            return

        passed = int(summary_match.group("passed"))
        total = int(summary_match.group("total"))
        assertions = int(summary_match.group("assertions"))
        parsed_count = len(parsed_cases)

        if not (
            parsed_count == self.EXPECTED_TEST_COUNT
            and passed == self.EXPECTED_TEST_COUNT
            and total == self.EXPECTED_TEST_COUNT
            and assertions == self.EXPECTED_ASSERTION_COUNT
        ):
            self._add_runner_failure(
                "suite_count_mismatch",
                "Package 1 suite integrity mismatch: "
                f"parsed={parsed_count}, summary={passed}/{total}, "
                f"assertions={assertions}; expected "
                f"{self.EXPECTED_TEST_COUNT} tests and "
                f"{self.EXPECTED_ASSERTION_COUNT} assertions.",
                output,
            )
