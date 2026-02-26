/**
 * record-tab-helpers.js
 * 기록하기 탭 렌더 함수 모음 — script.js 클로저 의존성을 DI 패턴으로 분리
 *
 * 모든 함수는 context 객체(ctx)를 첫 번째 인자로 받아 순수 로직을 담당한다.
 * script.js의 실제 함수들은 이 모듈을 import 후 ctx를 바인딩해 얇은 래퍼로 동작한다.
 *
 * Exports:
 *   updateFormTitle          — 폼 타이틀 업데이트
 *   updatePlaceholders       — 입력 필드 placeholder 업데이트
 *   renderNextMeasurementInfo — 기록 안내 텍스트 렌더
 */

/**
 * 기록 폼 상단 타이틀(주차/새 기록)을 업데이트한다.
 *
 * @param {object} ctx
 * @param {HTMLElement}      ctx.formTitle
 * @param {HTMLInputElement} ctx.editIndexInput
 * @param {Array}            ctx.measurements
 * @param {Function}         ctx.translate
 */
export function updateFormTitle({ formTitle, editIndexInput, measurements, translate }) {
    if (!formTitle) return;
    const editIndexVal = editIndexInput?.value ?? '';
    let week = 0;

    if (editIndexVal !== '' && !isNaN(editIndexVal)) {
        const index = parseInt(editIndexVal, 10);
        if (index >= 0 && index < measurements.length) {
            week = measurements[index].week ?? index;
        }
    } else {
        week = measurements.length;
    }

    const titleKey = editIndexVal === '' ? 'formTitleNew' : 'formTitleEdit';
    formTitle.innerHTML = translate(titleKey, { week });
}

/**
 * 폼 입력 필드의 placeholder를 직전 기록값 기반으로 갱신한다.
 *
 * @param {object} ctx
 * @param {HTMLFormElement} ctx.form
 * @param {Array}           ctx.measurements
 * @param {Function}        ctx.translate
 * @param {Function}        ctx.formatValue  - (value, key) => string
 */
export function updatePlaceholders({ form, measurements, translate, formatValue }) {
    if (!form) return;
    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

    form.querySelectorAll('input[type="number"], input[type="text"], textarea').forEach(input => {
        const key = input.name;
        if (!key) return;

        let placeholderText = '';
        const lastValue = lastMeasurement ? lastMeasurement[key] : null;

        if (lastValue !== null && lastValue !== undefined && lastValue !== '') {
            placeholderText = translate('placeholderPrevious', { value: formatValue(lastValue, key) });
        } else {
            if (key === 'estrogenLevel' || key === 'testosteroneLevel') {
                placeholderText = translate('valuePlaceholder');
            } else {
                const unit = translate(key).match(/\((.*?)\)/)?.[1] || '';
                placeholderText = unit;
            }
        }
        input.placeholder = placeholderText;
    });
}

/**
 * 다음 측정 안내 텍스트를 렌더링한다.
 *
 * @param {object} ctx
 * @param {HTMLElement} ctx.container            - #next-measurement-info 등
 * @param {Array}       ctx.measurements
 * @param {Function}    ctx.translate
 * @param {Function}    ctx.formatTimestamp      - (date, includeTime?) => string
 * @param {Function}    ctx.getMeasurementBaseDate
 * @param {Function}    ctx.toLocalDayIndex
 * @param {Function}    ctx.localDayIndexToDate
 */
export function renderNextMeasurementInfo({
    container,
    measurements,
    translate,
    formatTimestamp,
    getMeasurementBaseDate,
    toLocalDayIndex,
    localDayIndexToDate,
}) {
    if (!container) return;

    if (!measurements || measurements.length === 0) {
        container.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
        return;
    }

    try {
        const validData = measurements
            .map(m => ({ m, baseDate: getMeasurementBaseDate(m) }))
            .filter(item => item.baseDate && !isNaN(item.baseDate.getTime()));

        if (validData.length === 0) {
            container.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            return;
        }

        const sortedMeasurements = validData.sort(
            (a, b) => a.baseDate.getTime() - b.baseDate.getTime()
        );

        const lastItem = sortedMeasurements[sortedMeasurements.length - 1];
        const lastBaseDate = lastItem.baseDate;

        const todayBase = new Date();
        todayBase.setHours(0, 0, 0, 0);
        const todayIndex = toLocalDayIndex(todayBase);
        const lastIndex  = toLocalDayIndex(lastBaseDate);

        if (todayIndex === null || lastIndex === null) {
            container.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            return;
        }

        const nextIndex = lastIndex + 7;
        const nextMeasurementDate =
            localDayIndexToDate(nextIndex) ||
            new Date(
                lastBaseDate.getFullYear(),
                lastBaseDate.getMonth(),
                lastBaseDate.getDate() + 7
            );

        const daysAgo   = Math.max(0, todayIndex - lastIndex);
        const daysUntil = nextIndex - todayIndex;

        let messageKey = 'nextMeasurementInfo';
        const params = {
            lastDate:   formatTimestamp(lastBaseDate),
            daysAgo,
            nextDate:   formatTimestamp(nextMeasurementDate),
            daysUntil:  Math.abs(daysUntil),
        };

        if (daysUntil < 0) {
            messageKey = 'nextMeasurementInfoOverdue';
            params.daysOverdue = Math.abs(daysUntil);
        } else if (daysUntil === 0) {
            messageKey = 'nextMeasurementInfoToday';
        }

        container.innerHTML = `<p>${translate(messageKey, params)}</p>`;
    } catch (e) {
        console.error('[record-tab-helpers] renderNextMeasurementInfo error:', e);
        container.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
    }
}
