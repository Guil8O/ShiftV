#!/usr/bin/env node
/**
 * ShiftV Old Data (v1.5.1) → New v2 Format Converter
 * 
 * - Converts measurements: removes memo/memoLiked
 * - Converts memos → diary entries and/or quests
 * - Outputs: ShiftV_converted.json (importable backup)
 *            shiftv_diary.json (diary localStorage data)
 *            shiftv_quests.json (quests localStorage data)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════
// Read old data
// ═══════════════════════════════════════════════════════
const inputPath = process.argv[2] || resolve(__dirname, '..', '..', '..', '..', '다운로드', 'ShiftV_old_storge.json');
const old = JSON.parse(readFileSync(inputPath, 'utf-8'));

console.log(`[✓] Loaded old data: v${old.version}, ${old.data.measurements.length} measurements`);

// ═══════════════════════════════════════════════════════
// Memo Analysis & Classification
// ═══════════════════════════════════════════════════════
// Each memo is classified as:
//   diary  – personal reflection, observation, event record
//   quest  – has a specific goal, target, or action plan
//   both   – has diary-worthy content AND quest/goal content

function classifyMemo(memo, date, week) {
    if (!memo || memo.trim() === '') return null;

    const text = memo.trim();

    // Quest-like patterns: contains targets, goals, action plans
    const questPatterns = [
        /목표/,            // "목표" (goal/target)
        /까지/,            // "~까지" (until)
        /증량|감량|감소/,   // increase/decrease weight
        /세트|셋트/,        // sets (exercise)
        /칼로리|kcal/i,    // calorie targets
        /투여|증량|투약/,   // medication dosing plans
        /매일|일주일/,      // daily/weekly plans
        /할\s*것|하자|해야/,// things to do
        /시작/,            // start
        /계획/,            // plan
        /루틴/,            // routine
    ];

    const diaryPatterns = [
        /현상|증상/,        // symptoms/phenomena
        /살이\s*찜|빠짐/,   // weight gain/loss observation
        /회식|장염|노동/,   // events
        /발견|확인/,        // discovery/confirmation
        /성공|실패/,        // success/failure reflection
        /기록/,            // record
    ];

    const isQuestLike = questPatterns.some(p => p.test(text));
    const isDiaryLike = diaryPatterns.some(p => p.test(text));

    if (isQuestLike && isDiaryLike) return 'both';
    if (isQuestLike) return 'quest';
    return 'diary';
}

// ═══════════════════════════════════════════════════════
// Extract quest goals from memo text
// ═══════════════════════════════════════════════════════
function extractQuestsFromMemo(memo, date, week) {
    const quests = [];
    const text = memo.trim();

    // Try to extract weight targets (목표: XXkg)
    const weightTargetMatch = text.match(/목표[:\s]*(\d+\.?\d*)\s*(kg)?/);
    if (weightTargetMatch) {
        quests.push({
            title: `체중 ${weightTargetMatch[1]}kg 달성`,
            description: text,
            category: 'body',
            linkedMeasurementField: 'weight',
            targetValue: parseFloat(weightTargetMatch[1]),
            fromDate: date,
            fromWeek: week,
        });
    }

    // Exercise-related quests
    const exercisePatterns = [
        { re: /힙\s*쓰러스트\s*(?:매일\s*)?(\d+)\s*세?셋?트/i, title: (m) => `힙쓰러스트 매일 ${m[1]}세트` },
        { re: /유산소\s*(\d+)\s*칼로리/i, title: (m) => `유산소 ${m[1]}kcal 이상` },
        { re: /사이클링|사이클\s*유산소/i, title: () => `사이클링 유산소 루틴 유지` },
    ];

    for (const pat of exercisePatterns) {
        const m = text.match(pat.re);
        if (m) {
            quests.push({
                title: pat.title(m),
                description: text,
                category: 'exercise',
                fromDate: date,
                fromWeek: week,
            });
        }
    }

    // Diet-related quests
    const dietPatterns = [
        { re: /(\d+)\s*kcal\s*섭취|섭취\s*(\d+)\s*kcal/i, title: (m) => `일일 ${m[1] || m[2]}kcal 섭취 유지` },
        { re: /올리브유\s*많이/i, title: () => `올리브유 섭취 늘리기` },
        { re: /수분\s*보충/i, title: () => `수분 보충 많이 하기` },
    ];

    for (const pat of dietPatterns) {
        const m = text.match(pat.re);
        if (m) {
            quests.push({
                title: pat.title(m),
                description: text,
                category: 'diet',
                fromDate: date,
                fromWeek: week,
            });
        }
    }

    // Medication/hormone quests
    const medPatterns = [
        { re: /에스트라디올.*?(\d+\.?\d*)\s*(mg)?.*?(증량|까지|투여)/i, title: (m) => `에스트라디올 ${m[1]}mg ${m[3]}` },
        { re: /알닥톤.*?(\d+)\s*mg/i, title: (m) => `알닥톤 ${m[1]}mg 도입` },
        { re: /투약\s*중지|투약\s*중단/i, title: () => `일시 투약 중단 기간` },
    ];

    for (const pat of medPatterns) {
        const m = text.match(pat.re);
        if (m) {
            quests.push({
                title: pat.title(m),
                description: text,
                category: 'hormone',
                fromDate: date,
                fromWeek: week,
            });
        }
    }

    // Lifestyle quests
    if (/수면\s*사이클|수면시간/.test(text)) {
        quests.push({
            title: '수면 사이클 바로잡기',
            description: text,
            category: 'lifestyle',
            fromDate: date,
            fromWeek: week,
        });
    }

    // If no specific quest extracted but it's quest-like, create a generic one
    if (quests.length === 0) {
        // For long plans with routines
        if (text.length > 200 && /루틴|Day\s*[AB]|세트|스트레치/i.test(text)) {
            quests.push({
                title: `Week ${week} 운동 루틴 계획`,
                description: text,
                category: 'exercise',
                fromDate: date,
                fromWeek: week,
            });
        } else {
            quests.push({
                title: `Week ${week} 목표 계획`,
                description: text,
                category: 'custom',
                fromDate: date,
                fromWeek: week,
            });
        }
    }

    return quests;
}

// ═══════════════════════════════════════════════════════
// Process measurements & extract diary/quests
// ═══════════════════════════════════════════════════════
const diary = {};       // date-keyed
const questsList = [];  // array
const seenQuestTitles = new Set();

const newMeasurements = old.data.measurements.map(m => {
    const { memo, memoLiked, ...rest } = m;

    // Process memo if present
    if (memo && memo.trim()) {
        const date = m.date;
        const week = m.week;
        const classification = classifyMemo(memo, date, week);

        if (classification === 'diary' || classification === 'both') {
            // Create diary entry
            diary[date] = {
                date: date,
                mood: memoLiked ? 4 : null,  // memoLiked → mood "좋음" (4=great, but let's use 3=good for liked)
                text: memo.trim(),
                questProgress: {},
                _createdAt: new Date(m.timestamp).toISOString()
            };
            // If memoLiked, set mood to '좋음' level
            if (memoLiked) {
                diary[date].mood = 3; // 0=terrible, 1=bad, 2=okay, 3=good, 4=great
            }
        }

        if (classification === 'quest' || classification === 'both') {
            const extracted = extractQuestsFromMemo(memo, date, week);
            for (const q of extracted) {
                // Deduplicate by title similarity
                if (!seenQuestTitles.has(q.title)) {
                    seenQuestTitles.add(q.title);

                    const CATEGORY_MAP = {
                        'body': 'body',
                        'exercise': 'exercise',
                        'diet': 'diet',
                        'lifestyle': 'lifestyle',
                        'hormone': 'hormone',
                        'custom': 'custom',
                    };

                    questsList.push({
                        title: q.title,
                        description: q.description.substring(0, 300),
                        category: CATEGORY_MAP[q.category] || 'custom',
                        unit: q.linkedMeasurementField === 'weight' ? 'kg' : '',
                        initialValue: 0,
                        currentValue: 0,
                        targetValue: q.targetValue || 0,
                        targetDate: null,
                        linkedMeasurementField: q.linkedMeasurementField || null,
                        trackingType: q.linkedMeasurementField ? 'linked' : 'manual',
                        status: 'completed',  // past quests are completed
                        pinned: false,
                        favorited: false,
                        history: [],
                        alarm: { enabled: false, days: ['daily'], time: '09:00' },
                        createdAt: new Date(m.timestamp).toISOString()
                    });
                }
            }
        }

        // If only quest-like but also an important observation, still add diary
        if (classification === 'quest' && !diary[date]) {
            diary[date] = {
                date: date,
                mood: memoLiked ? 3 : null,
                text: memo.trim(),
                questProgress: {},
                _createdAt: new Date(m.timestamp).toISOString()
            };
        }
    }

    return rest;
});

// ═══════════════════════════════════════════════════════
// Build v2 export file
// ═══════════════════════════════════════════════════════
const v2Export = {
    app: "ShiftV",
    version: "2.0.0a",
    exportDate: new Date().toISOString(),
    settings: old.settings,
    data: {
        measurements: newMeasurements,
        targets: old.data.targets,
        notes: old.data.notes || []
    }
};

// ═══════════════════════════════════════════════════════
// Write outputs
// ═══════════════════════════════════════════════════════
const outDir = '/home/hynk/다운로드';

const mainOut = resolve(outDir, 'ShiftV_converted.json');
writeFileSync(mainOut, JSON.stringify(v2Export, null, 2), 'utf-8');
console.log(`[✓] Main backup: ${mainOut}`);
console.log(`    ${newMeasurements.length} measurements, memo/memoLiked removed`);

const diaryOut = resolve(outDir, 'shiftv_diary.json');
writeFileSync(diaryOut, JSON.stringify(diary, null, 2), 'utf-8');
console.log(`[✓] Diary data: ${diaryOut}`);
console.log(`    ${Object.keys(diary).length} diary entries created from memos`);

const questsOut = resolve(outDir, 'shiftv_quests.json');
writeFileSync(questsOut, JSON.stringify(questsList, null, 2), 'utf-8');
console.log(`[✓] Quests data: ${questsOut}`);
console.log(`    ${questsList.length} quests extracted from memos`);

// ═══════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════
console.log('\n── Memo Classification Summary ──');
let diaryOnly = 0, questOnly = 0, both = 0, noMemo = 0;
for (const m of old.data.measurements) {
    if (!m.memo || !m.memo.trim()) { noMemo++; continue; }
    const c = classifyMemo(m.memo, m.date, m.week);
    if (c === 'diary') diaryOnly++;
    else if (c === 'quest') questOnly++;
    else if (c === 'both') both++;
}
console.log(`  No memo:     ${noMemo}`);
console.log(`  Diary only:  ${diaryOnly}`);
console.log(`  Quest only:  ${questOnly}`);
console.log(`  Both:        ${both}`);
console.log(`  Total memos: ${diaryOnly + questOnly + both}`);

console.log('\n── Quest Categories ──');
const catCounts = {};
for (const q of questsList) {
    catCounts[q.category] = (catCounts[q.category] || 0) + 1;
}
for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`  ${cat}: ${count}`);
}

console.log('\nDone! Files saved to:', outDir);
