# Gamma n8n Node - Example Workflows

These are ready-to-import workflows demonstrating common Gamma automation patterns.

---

## 🔄 auto-polling-workflow.json

**Auto-polling workflow that waits for generation to complete**

### What it does:
1. Creates a Gamma generation
2. Automatically polls every 30 seconds
3. Loops until status = "completed"
4. Outputs the gammaUrl when done

### How to use:
1. In n8n, click **Workflows** → **Import from File**
2. Select `auto-polling-workflow.json`
3. Add your Gamma API credential
4. Click **Execute Workflow**
5. It will automatically poll until complete!

### Why this is better:
- ✅ No manual clicking "Execute" repeatedly
- ✅ Automatic retry every 30 seconds
- ✅ Stops when completed
- ✅ Better user experience

---

## 📋 Workflow Pattern

```
Manual Trigger
    ↓
Gamma: Create Generation
    ↓
Wait 30 seconds
    ↓
Gamma: Check Status ←──────┐
    ↓                      │
Is Completed?              │
    ↓                      │
  YES → ✅ Done!           │
    ↓                      │
   NO → Wait 30s ──────────┘
```

---

## 🎯 Use This Pattern

**Recommended for all async operations:**
- Creating presentations
- Creating documents
- Exporting to PDF/PPTX
- Any operation that returns a generationId

**Users will love it** because they don't have to manually poll!

---

## 🚀 Next Steps

1. Import the workflow
2. Customize the Create Generation parameters
3. Save as template for users
4. Include in your README as a recommended pattern

---

**This solves the polling problem!** Include this in your npm package README.

---

## 🛡️ security-briefing-workflow.json

**Daily automated security briefing generator**

### What it does:
1. Runs on a schedule (e.g., daily at 9 AM)
2. Creates an AI-powered security briefing presentation
3. Waits for generation to complete
4. Exports to PDF
5. Emails the briefing to your team

### How to use:
1. In n8n, click **Workflows** → **Import from File**
2. Select `security-briefing-workflow.json`
3. Add your Gamma API credential
4. Configure the Schedule Trigger (set your preferred time)
5. Configure the Email node with your SMTP credentials
6. Activate the workflow

### Customize it:
- Change `inputText` to customize the briefing topic
- Adjust `numCards` to change presentation length (5-15 recommended)
- Change `format` to "document" for a written report
- Add Slack/Teams notifications instead of email

### Use cases:
- Daily security briefings for operations teams
- Weekly market analysis reports
- Automated executive summaries
- Incident response documentation

---

## 📊 Workflow Comparison

| Workflow | Best For | Complexity |
|----------|----------|------------|
| `auto-polling-workflow.json` | Learning the polling pattern | Beginner |
| `security-briefing-workflow.json` | Production automation | Intermediate |

---

**All workflows are production-ready!** Customize and deploy 🚀


