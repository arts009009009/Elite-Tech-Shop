package com.eliteshop.service;

import java.util.logging.Level;
import java.util.logging.Logger;

public class NotificationService {

    private static final Logger log = Logger.getLogger(NotificationService.class.getName());
    private static final String OS = System.getProperty("os.name", "").toLowerCase();

    public static void notifyAsync(String title, String message) {
        Thread t = new Thread(() -> notify(title, message), "notif-" + System.currentTimeMillis());
        t.setDaemon(true);
        t.start();
    }

    private static void notify(String title, String message) {
        try {
            String[] cmd = getCommand(title, message);
            if (cmd == null) {
                log.warning("No notification method for this OS");
                return;
            }
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            process.getInputStream().readAllBytes();
            process.waitFor();
        } catch (Exception e) {
            log.log(Level.WARNING, "Notification failed", e);
        }
    }

    private static String[] getCommand(String title, String message) {
        if (isWindows()) {
            return new String[]{
                "powershell", "-Command",
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;" +
                "$n = New-Object System.Windows.Forms.NotifyIcon;" +
                "$n.Icon = [System.Drawing.SystemIcons]::Information;" +
                "$n.Visible = $true;" +
                "$n.ShowBalloonTip(0, '" + escapePs(title) + "', '" + escapePs(message) + "', 'Info');"
            };
        }
        if (isMac()) {
            return new String[]{
                "osascript", "-e",
                "display notification \"" + escapeShell(message) + "\" with title \"" + escapeShell(title) + "\""
            };
        }
        return new String[]{
            "notify-send",
            "--app-name=Elite Shop",
            "--icon=dialog-information",
            "--urgency=critical",
            "--expire-time=0",
            title,
            message
        };
    }

    private static boolean isWindows() {
        return OS.contains("win");
    }

    private static boolean isMac() {
        return OS.contains("mac") || OS.contains("darwin");
    }

    private static String escapeShell(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("$", "\\$")
                .replace("`", "\\`");
    }

    private static String escapePs(String s) {
        return s.replace("'", "''")
                .replace("`", "``")
                .replace("$", "`$");
    }
}
