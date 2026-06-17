# 📖 Commands Reference

## 🛠️ Moderation Commands

All moderation commands require proper permissions to use.

### !warn
**Warn a member for rule violation**

```
Usage: !warn <member> [reason]
Permissions: Manage Messages
Example: !warn @spammer Spamming in chat

Returns:
- Warns the member
- Logs the action
- DMs member about warning
- Shows warning count
```

### !kick
**Kick a member from the server**

```
Usage: !kick <member> [reason]
Permissions: Manage Messages
Example: !kick @troublemaker Disruptive behavior

Returns:
- Removes member from server
- Logs the action
- Can rejoin later
```

### !ban
**Permanently ban a member**

```
Usage: !ban <member> [reason]
Permissions: Administrator
Example: !ban @rule-breaker Repeated violations

Returns:
- Removes member permanently
- Prevents rejoin
- Logs the action
```

### !mute
**Temporarily silence a member (timeout)**

```
Usage: !mute <member> <duration> [reason]
Duration format: 10s, 5m, 1h, 1d
Permissions: Manage Messages

Examples:
- !mute @user 10m Spam
- !mute @user 1h Inappropriate language
- !mute @user 1d Harassment

Returns:
- Member cannot send messages
- Timeout expires automatically
- Logs the action
```

### !unmute
**Remove timeout from a member**

```
Usage: !unmute <member> [reason]
Permissions: Manage Messages
Example: !unmute @user Timeout expired

Returns:
- Member can send messages again
- Logs the action
```

### !warnings
**Check a member's warning history**

```
Usage: !warnings [member]
Permissions: None (anyone can check)
Example: !warnings @user

Returns:
- List of all warnings
- Dates and reasons
- Warning count
```

### !modlogs
**View server moderation actions**

```
Usage: !modlogs [limit]
Permissions: Manage Messages
Limit: 1-50 (default: 10)

Examples:
- !modlogs
- !modlogs 25

Returns:
- Recent moderation actions
- Action type (warn, kick, ban, mute)
- User and moderator info
- Timestamps
```

### !clear
**Delete messages in bulk**

```
Usage: !clear <amount>
Permissions: Manage Messages
Amount: 1-100 (default: 10)

Examples:
- !clear 10
- !clear 50

Returns:
- Deletes specified number of messages
- Shows confirmation message
```

---

## 🎯 Utility Commands

### !help
**Display help information**

```
Usage: !help [command]
Permissions: None (anyone can use)

Examples:
- !help                    (shows all commands)
- !help warn              (shows help for warn command)
- !help kick              (shows help for kick command)

Returns:
- Command list
- Usage instructions
- Permission requirements
```

### !ping
**Check bot response time**

```
Usage: !ping
Permissions: None
Example: !ping

Returns:
- Bot latency in milliseconds
- Indicates bot health
```

### !serverinfo
**Get detailed server information**

```
Usage: !serverinfo
Permissions: None

Returns:
- Server name and ID
- Owner information
- Member count
- Channel counts
- Creation date
- Roles count
- Verification level
```

### !userinfo
**Get detailed user information**

```
Usage: !userinfo [member]
Permissions: None

Examples:
- !userinfo                (shows your info)
- !userinfo @username      (shows their info)

Returns:
- User ID and name
- Account creation date
- Server join date
- Current status
- User roles
- Bot badge if applicable
```

### !suggest
**Suggest a feature or improvement**

```
Usage: !suggest <suggestion>
Permissions: None
Example: !suggest Add leveling system

Returns:
- Confirmation message
- Logs suggestion for review
```

### !report
**Report a user for rule violation**

```
Usage: !report <member> <reason>
Permissions: None
Example: !report @scammer Trying to scam members

Returns:
- Confirmation message
- Logs report for moderation team
```

### !stats
**View bot statistics**

```
Usage: !stats
Permissions: Bot Owner Only
Example: !stats

Returns:
- Number of servers
- Total members across servers
- Total channels
- Bot latency
- Uptime information
```

---

## 🎮 Auto-Moderation (Automatic)

The bot automatically performs these actions:

### Anti-Spam
```
Trigger: User sends 5+ messages in 10 seconds
Action: Mute for 5 minutes
Log: Logged in moderation logs
```

### Anti-Raid
```
Trigger: 10+ users join in 5 minutes
Action: Alert in logs
Suggest: Manual intervention by mods
```

### Bad Content Filter
```
Trigger: Blocked words/phrases sent
Blocked: Invite links, scam keywords
Action: Message deleted (when enabled)
Log: Logged for review
```

---

## ⚙️ Command Syntax

### Member Mentions
```
You can mention members in multiple ways:
- @username
- @username#1234
- User ID: 123456789
```

### Duration Format
```
For timeout commands:
- 10s   = 10 seconds
- 5m    = 5 minutes
- 1h    = 1 hour
- 1d    = 1 day
```

### Optional Parameters
```
[parameter] = optional (can be omitted)
<parameter> = required (must provide)
```

---

## 🔐 Permission Levels

### No Permission Required
- `!help`
- `!ping`
- `!userinfo`
- `!serverinfo`
- `!warnings`
- `!suggest`
- `!report`

### Requires: Manage Messages
- `!warn`
- `!kick`
- `!mute`
- `!unmute`
- `!modlogs`
- `!clear`

### Requires: Administrator
- `!ban`

### Bot Owner Only
- `!stats`

---

## 💡 Usage Tips

### Tips for Mods

1. **Document everything** - Always include a reason with moderation actions
2. **Proportional response** - Warn before kick, kick before ban
3. **Check warnings** - Use `!warnings` before taking action
4. **Review logs** - Regularly check `!modlogs` for patterns
5. **Communicate** - DMs explain why they were warned/kicked

### Tips for Users

1. **Read help** - Use `!help` if unsure about commands
2. **Check rules** - Review server rules before posting
3. **No spam** - Bot will automatically mute spammers
4. **No invites** - Sharing other server invites will be flagged
5. **Be respectful** - Helps everyone enjoy the community

---

## 🚀 Advanced Usage

### Check Specific User Warnings
```
!warnings @problematic-user
```

### See Recent Moderation
```
!modlogs 30
```

### Detailed User Info Before Action
```
!userinfo @user
!warnings @user
!modlogs
```

### Verify Bot Status
```
!ping
!stats (if owner)
```

---

## ❓ FAQ

**Q: Can I undo a ban?**
A: Yes, ask a server admin to unban you in Server Settings → Bans

**Q: How long does a mute last?**
A: Specified in the command (e.g., !mute @user 1h = 1 hour)

**Q: What if I was warned by mistake?**
A: Contact a mod to explain the situation

**Q: Can bot be added to multiple servers?**
A: Yes! Each server gets its own settings and logs

**Q: How do I remove bot from server?**
A: Server Settings → Integrations → Remove Bot

---

## 📞 Need Help?

Check:
1. Command syntax is correct
2. You have required permissions
3. Member exists in server
4. Discord permissions are set correctly
5. Bot is online and responsive

Use `!help <command>` for detailed command info!

---

**Last Updated:** 2025-06-16 | v1.0.0
