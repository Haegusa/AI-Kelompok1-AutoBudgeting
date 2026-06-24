<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Auto-Sync to Vercel
After fulfilling any code update or modification request, ALWAYS automatically stage all changes, commit them with a descriptive message, and push to the remote repository (`git add .; git commit -m "..."; git push`) to trigger a Vercel deployment. You must use the `run_command` tool to propose this action for the user's approval at the end of your workflow.
