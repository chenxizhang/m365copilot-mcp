# Next Steps to Complete the Release

## What Has Been Done ✅

1. **Version Bumped**: Updated from `0.6.2` to `0.7.0` in both `package.json` and `package-lock.json`
2. **Build Verified**: Project compiles successfully with TypeScript
3. **Git Tag Created**: Local annotated tag `v0.7.0` created with comprehensive release notes
4. **Release Notes Prepared**: Complete release documentation in `RELEASE_NOTES_v0.7.0.md`
5. **Changes Committed**: All changes committed to the branch `copilot/bump-version-and-create-release`

## What You Need to Do 🎯

Since this environment has authentication restrictions that prevent pushing git tags and creating GitHub releases programmatically, please complete the following steps:

### Step 1: Merge the Pull Request
First, review and merge the PR for branch `copilot/bump-version-and-create-release` to `master`.

### Step 2: Push the Git Tag
After merging to master, push the v0.7.0 tag to trigger the release:

```bash
# Switch to master and pull the merged changes
git checkout master
git pull origin master

# Tag the current commit (should already have the tag if you pulled)
# If not, create it:
git tag -a v0.7.0 -m "Release version 0.7.0 - Production Polish Complete"

# Push the tag to remote
git push origin v0.7.0
```

### Step 3: Create GitHub Release

#### Option A: Create Release via GitHub Web UI (Recommended)

1. Go to: https://github.com/chenxizhang/m365copilot-mcp/releases/new
2. **Choose a tag**: Select `v0.7.0` from the dropdown
3. **Release title**: `v0.7.0 - Production Polish Complete`
4. **Description**: Copy the content from the "What's New in v0.7.0" section in `RELEASE_NOTES_v0.7.0.md`
5. **Set as latest release**: Check this box
6. Click **Publish release**

#### Option B: Manual Workflow Trigger

If you prefer to publish to npm without creating a GitHub release:

1. Go to: https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/publish.yml
2. Click **Run workflow**
3. Leave the version field empty (it will use 0.7.0 from package.json)
4. Click **Run workflow**

### Step 4: Verify the Release

After publishing, verify:

1. **GitHub Release**: https://github.com/chenxizhang/m365copilot-mcp/releases
   - Should show v0.7.0 as the latest release
   
2. **NPM Package**: https://www.npmjs.com/package/m365-copilot-mcp
   - Should show version 0.7.0
   - Package should be accessible via `npm install m365-copilot-mcp`
   
3. **GitHub Actions**: https://github.com/chenxizhang/m365copilot-mcp/actions
   - Check that the "Publish to npm" workflow completed successfully
   - Review the workflow summary for any errors

### Step 5: Test the Published Package

Test the published package to ensure it works correctly:

```bash
# Test with npx (most common usage)
npx m365-copilot-mcp --help

# Or install and test globally
npm install -g m365-copilot-mcp@0.7.0
m365-copilot-mcp --help

# Test with Claude Code
claude mcp add --scope user --transport stdio m365-copilot -- npx -y m365-copilot-mcp
```

## Important Notes

### Prerequisites for Publishing
- **NPM_TOKEN**: Ensure the `NPM_TOKEN` secret is configured in your GitHub repository settings
  - Go to: Settings → Secrets and variables → Actions
  - Add a new secret named `NPM_TOKEN`
  - Use an "Automation" token from npmjs.com

### GitHub Actions Publish Workflow
The publish workflow (`.github/workflows/publish.yml`) will:
- Automatically trigger when you create a GitHub release
- Build the project using `npm run build`
- Publish to npm with provenance (supply chain security)
- Generate a summary with package link

### If Something Goes Wrong
If the publish workflow fails:
1. Check the GitHub Actions logs for errors
2. Verify NPM_TOKEN is correctly configured
3. Check npm for any naming conflicts
4. Review the workflow file for any issues

You can also publish manually as a fallback:
```bash
npm login
npm publish --access public
```

## Questions?
If you encounter any issues or have questions about the release process, please refer to:
- `CLAUDE.md` - Development guide with detailed publishing instructions
- `RELEASE_NOTES_v0.7.0.md` - Complete release notes and changelog
- GitHub Actions logs - For troubleshooting automated publishing

---

**Ready to release!** 🚀 Follow the steps above to complete the v0.7.0 release.
