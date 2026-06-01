const STORAGE_KEY = 'redirectRules';
const DEFAULT_URL_PREFIX = 'https://';

const ICONS = {
  add: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  `,
  save: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.5-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  `,
  clone: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  `,
  delete: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </svg>
  `,
  cancel: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  `,
};

const rulesContainer = document.getElementById('rules');
const ruleCount = document.getElementById('rule-count');
const enabledCount = document.getElementById('enabled-count');
const fromInput = document.getElementById('from');
const toInput = document.getElementById('to');
const matchDomainInput = document.getElementById('match-domain');
const addButton = document.getElementById('add');
const formError = document.getElementById('form-error');

let rulesState = [];
let editingRuleId = null;

function createId() {
  return crypto.randomUUID?.() || `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRule(rule) {
  return {
    id: rule.id || createId(),
    from: typeof rule.from === 'string' ? rule.from.trim() : '',
    to: typeof rule.to === 'string' ? rule.to.trim() : '',
    enabled: rule.enabled !== false,
    matchDomain: rule.matchDomain === true,
  };
}

function sortActiveFirst(rules) {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) => Number(b.rule.enabled) - Number(a.rule.enabled) || a.index - b.index)
    .map(({ rule }) => rule);
}

function setFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function iconButton({ icon, label, className = '', onClick, type = 'button' }) {
  const button = document.createElement('button');
  button.type = type;
  button.className = `icon-button ${className}`.trim();
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = ICONS[icon];
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  return button;
}

function createToggle(rule) {
  const label = document.createElement('label');
  label.className = 'toggle';
  label.title = rule.enabled ? 'Disable rule' : 'Enable rule';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = rule.enabled;
  input.setAttribute('aria-label', rule.enabled ? 'Disable rule' : 'Enable rule');
  input.addEventListener('change', async () => {
    const nextRules = rulesState.map((item) => (item.id === rule.id ? { ...item, enabled: input.checked } : item));
    await persistRules(nextRules);
  });

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';

  label.append(input, slider);
  return label;
}

function createRulePreview(rule) {
  const block = document.createElement('div');
  block.className = 'rule-preview';

  const fromLine = document.createElement('p');
  fromLine.className = 'rule-line';
  fromLine.innerHTML = `<span>From</span>${escapeHtml(rule.from)}`;

  const toLine = document.createElement('p');
  toLine.className = 'rule-line';
  toLine.innerHTML = `<span>To</span>${escapeHtml(rule.to)}`;

  block.append(fromLine, toLine);

  if (rule.matchDomain) {
    const modeLine = document.createElement('p');
    modeLine.className = 'rule-line';
    modeLine.innerHTML = '<span>Mode</span>Any path on domain';
    block.append(modeLine);
  }

  return block;
}

function createEditForm(rule) {
  const form = document.createElement('form');
  form.className = 'inline-editor';

  const fromField = document.createElement('input');
  fromField.type = 'text';
  fromField.value = rule.from || DEFAULT_URL_PREFIX;
  fromField.placeholder = 'https://site.com/path';
  fromField.setAttribute('aria-label', 'Edit source URL');

  const toField = document.createElement('input');
  toField.type = 'text';
  toField.value = rule.to || DEFAULT_URL_PREFIX;
  toField.placeholder = 'https://localhost:3000';
  toField.setAttribute('aria-label', 'Edit target URL');

  const matchDomainFieldLabel = document.createElement('label');
  matchDomainFieldLabel.className = 'checkbox-row inline-checkbox';

  const matchDomainField = document.createElement('input');
  matchDomainField.type = 'checkbox';
  matchDomainField.checked = rule.matchDomain;

  const matchDomainText = document.createElement('span');
  matchDomainText.textContent = 'Redirect any path on this domain';

  matchDomainFieldLabel.append(matchDomainField, matchDomainText);

  const error = document.createElement('p');
  error.className = 'inline-error';
  error.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'rule-actions';

  async function submitEdit(event) {
    event.preventDefault();
    const prepared = prepareRuleInput(fromField.value, toField.value, matchDomainField.checked);

    if (!prepared.ok) {
      error.textContent = prepared.message;
      error.hidden = false;
      return;
    }

    const nextRules = rulesState.map((item) =>
      item.id === rule.id ? { ...item, from: prepared.from, to: prepared.to, matchDomain: prepared.matchDomain } : item,
    );
    editingRuleId = null;
    await persistRules(nextRules);
  }

  const save = iconButton({
    icon: 'save',
    label: 'Save rule',
    className: 'primary',
    type: 'submit',
  });

  const cancel = iconButton({
    icon: 'cancel',
    label: 'Cancel edit',
    onClick: (event) => {
      event.preventDefault();
      editingRuleId = null;
      renderRules();
    },
  });

  actions.append(save, cancel);
  form.append(fromField, toField, matchDomainFieldLabel, error, actions);
  form.addEventListener('submit', submitEdit);
  return form;
}

function createRuleCard(rule) {
  const article = document.createElement('article');
  article.className = `rule-card${rule.enabled ? '' : ' is-disabled'}`;

  const head = document.createElement('div');
  head.className = 'rule-head';

  const badge = document.createElement('span');
  badge.className = `state-pill${rule.enabled ? ' is-live' : ''}`;
  badge.textContent = rule.enabled ? 'On' : 'Off';

  const modeBadge = document.createElement('span');
  modeBadge.className = `mode-pill${rule.matchDomain ? ' is-domain' : ''}`;
  modeBadge.textContent = rule.matchDomain ? 'Any path' : 'Exact path';

  const headActions = document.createElement('div');
  headActions.className = 'head-actions';
  headActions.append(createToggle(rule));

  head.append(badge, modeBadge, headActions);

  const body = editingRuleId === rule.id ? createEditForm(rule) : createRulePreview(rule);

  const actions = document.createElement('div');
  actions.className = 'rule-actions';

  if (editingRuleId !== rule.id) {
    actions.append(
      iconButton({
        icon: 'edit',
        label: 'Edit rule',
        onClick: () => {
          editingRuleId = rule.id;
          renderRules();
        },
      }),
      iconButton({
        icon: 'clone',
        label: 'Clone rule',
        onClick: async () => {
          const clone = { ...rule, id: createId() };
          const nextRules = [clone, ...rulesState];
          await persistRules(nextRules);
        },
      }),
      iconButton({
        icon: 'delete',
        label: 'Delete rule',
        className: 'danger',
        onClick: async () => {
          const nextRules = rulesState.filter((item) => item.id !== rule.id);
          if (editingRuleId === rule.id) {
            editingRuleId = null;
          }
          await persistRules(nextRules);
        },
      }),
    );
  }

  article.append(head, body, actions);
  return article;
}

function renderSummary() {
  ruleCount.textContent = `${rulesState.length} ${rulesState.length === 1 ? 'rule' : 'rules'}`;
  const active = rulesState.filter((rule) => rule.enabled).length;
  enabledCount.textContent = `${active} active`;
}

function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state card';
  empty.innerHTML = `
    <p>No redirects yet.</p>
    <span>Add first rule above.</span>
  `;
  rulesContainer.append(empty);
}

function renderRules() {
  rulesContainer.innerHTML = '';
  renderSummary();

  if (!rulesState.length) {
    renderEmptyState();
    return;
  }

  const fragment = document.createDocumentFragment();
  rulesState.forEach((rule) => fragment.append(createRuleCard(rule)));
  rulesContainer.append(fragment);
}

async function persistRules(nextRules) {
  const normalized = nextRules.map(normalizeRule);
  rulesState = normalized;
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  renderRules();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureDefaultScheme(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === DEFAULT_URL_PREFIX) {
    return '';
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `${DEFAULT_URL_PREFIX}${trimmed}`;
}

function originOnly(value) {
  const url = new URL(ensureDefaultScheme(value));
  return url.origin;
}

function prepareRuleInput(rawFrom, rawTo, matchDomain) {
  const from = ensureDefaultScheme(rawFrom);
  const to = ensureDefaultScheme(rawTo);

  if (!from || !to) {
    return { ok: false, message: 'Both URL fields required.' };
  }

  try {
    const fromUrl = new URL(from);
    const toUrl = new URL(to);

    if (matchDomain) {
      return {
        ok: true,
        from: originOnly(fromUrl.href),
        to: originOnly(toUrl.href),
        matchDomain: true,
      };
    }

    return { ok: true, from: fromUrl.href, to: toUrl.href, matchDomain: false };
  } catch {
    return { ok: false, message: 'Enter valid URLs.' };
  }
}

function resetComposer() {
  fromInput.value = DEFAULT_URL_PREFIX;
  toInput.value = DEFAULT_URL_PREFIX;
  matchDomainInput.checked = false;
}

async function handleAddRule() {
  const prepared = prepareRuleInput(fromInput.value, toInput.value, matchDomainInput.checked);

  if (!prepared.ok) {
    setFormError(prepared.message);
    return;
  }

  const nextRules = [
    {
      id: createId(),
      from: prepared.from,
      to: prepared.to,
      enabled: true,
      matchDomain: prepared.matchDomain,
    },
    ...rulesState,
  ];
  setFormError('');
  resetComposer();
  await persistRules(nextRules);
}

addButton.innerHTML = `Add ${ICONS.add}`;
addButton.addEventListener('click', handleAddRule);

function persistSortedRulesOnClose() {
  if (!rulesState.length) {
    return;
  }

  chrome.storage.local.set({ [STORAGE_KEY]: sortActiveFirst(rulesState) });
}

window.addEventListener('pagehide', persistSortedRulesOnClose);
window.addEventListener('beforeunload', persistSortedRulesOnClose);

[fromInput, toInput, matchDomainInput].forEach((input) => {
  input.addEventListener('input', () => {
    if (!formError.hidden) {
      setFormError('');
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddRule();
    }
  });
});

chrome.storage.local.get(STORAGE_KEY, async (data) => {
  const rawRules = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  const normalized = sortActiveFirst(rawRules.map(normalizeRule));
  rulesState = normalized;
  renderRules();

  const changed = JSON.stringify(rawRules) !== JSON.stringify(normalized);
  if (changed) {
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  }
});
