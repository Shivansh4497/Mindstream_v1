import { supabase } from './supabaseClient';
import { Entry, Habit, Intention, Reflection } from '../types';

export interface ExportData {
    entries: Entry[];
    habits: Habit[];
    intentions: Intention[];
    reflections: Reflection[];
    userProfile: any;
    exportDate: string;
}

export const fetchAllUserData = async (userId: string): Promise<ExportData> => {
    const [entries, habits, intentions, reflections, userProfile] = await Promise.all([
        supabase.from('entries').select('*').eq('user_id', userId),
        supabase.from('habits').select('*').eq('user_id', userId),
        supabase.from('intentions').select('*').eq('user_id', userId),
        supabase.from('reflections').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).single()
    ]);

    if (entries.error) throw entries.error;
    if (habits.error) throw habits.error;
    if (intentions.error) throw intentions.error;
    if (reflections.error) throw reflections.error;

    return {
        entries: entries.data || [],
        habits: habits.data || [],
        intentions: intentions.data || [],
        reflections: reflections.data || [],
        userProfile: userProfile.data || {},
        exportDate: new Date().toISOString()
    };
};

export const generateMarkdownExport = (data: ExportData): string => {
    let md = `# Mindstream Data Export\nGenerated on: ${new Date(data.exportDate).toLocaleString()}\n\n`;

    md += `## Profile\n`;
    md += `- Email: ${data.userProfile.email}\n`;
    md += `- ID: ${data.userProfile.id}\n\n`;

    md += `## Entries (${data.entries.length})\n\n`;
    data.entries.forEach(entry => {
        md += `### ${new Date(entry.timestamp).toLocaleDateString()} - ${entry.title || 'Untitled'}\n`;
        md += `**Mood:** ${entry.primary_sentiment || 'N/A'} ${entry.emoji || ''}\n\n`;
        md += `${entry.text}\n\n`;
        if (entry.tags && entry.tags.length > 0) {
            md += `*Tags: ${entry.tags.join(', ')}*\n\n`;
        }
        md += `---\n\n`;
    });

    md += `## Habits (${data.habits.length})\n\n`;
    data.habits.forEach(habit => {
        md += `- [${habit.emoji}] **${habit.name}** (${habit.frequency})\n`;
        md += `  - Current Streak: ${habit.current_streak}\n`;
        md += `  - Category: ${habit.category}\n`;
    });
    md += `\n`;

    md += `## Intentions (${data.intentions.length})\n\n`;
    data.intentions.forEach(intention => {
        md += `- [${intention.status === 'completed' ? 'x' : ' '}] **${intention.text}** (${intention.timeframe})\n`;
    });

    return md;
};

export const downloadData = (data: any, filename: string, type: 'json' | 'markdown') => {
    let content = '';
    let mimeType = '';

    if (type === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
    } else {
        content = typeof data === 'string' ? data : generateMarkdownExport(data);
        mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
