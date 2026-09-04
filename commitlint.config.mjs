// config-conventional names conventional-changelog-conventionalcommits as its parserPreset, and
// when that module is absent from the pre-commit hook env commitlint falls back to a parser whose
// header pattern has no `!`, so `feat(x)!: y` fails as "type may not be empty". The pattern is
// pinned here so the breaking-change marker parses whatever the hook env resolves.
export default {
	extends: ["@commitlint/config-conventional"],
	parserPreset: {
		parserOpts: {
			headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
			headerCorrespondence: ["type", "scope", "subject"],
		},
	},
	rules: {
		"body-max-line-length": [0],
		"footer-max-line-length": [0],
		"planner-footers": [2, "always"],
		"planner-plan-footer": [1, "always"],
	},
	// Footer token shapes are defined in Git (src/index.md#git).
	plugins: [
		{
			rules: {
				"planner-footers": ({ raw }) => {
					const lines = (raw ?? "").split(/\r?\n/);
					for (const line of lines) {
						if (/^Supersedes:/.test(line) && !/^Supersedes: [0-9a-f]{7,40}; .+/.test(line)) {
							return [false, line];
						}
						if (/^Rejected:/.test(line) && !/^Rejected: [^;]+; .+/.test(line)) {
							return [false, line];
						}
					}
					return [true];
				},
				"planner-plan-footer": ({ raw }) => {
					const lines = (raw ?? "").split(/\r?\n/);
					for (const line of lines) {
						if (/^Plan:/.test(line) && !/^Plan: [\w.-]+$/.test(line)) {
							return [false, line];
						}
					}
					return [true];
				},
			},
		},
	],
};
