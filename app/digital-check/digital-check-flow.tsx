'use client';

import { ArrowIcon } from '../arrow-icon';
import { useEffect, useState } from 'react';
import { DIGITAL_CHECK_STEPS, URGENCY_SCALE_OPTIONS, type StepDefinition } from '@/lib/digital-check/questions';
import type {
  AnswerValue,
  Category,
  DigitalCheckRecommendation,
} from '@/lib/digital-check/types';
import { config } from '../site.config';

interface FlowProps {
  initialCheckId?: string;
  initialResumeToken?: string;
  initialLead?: {
    name?: string;
    company?: string;
    websiteOrInstagram?: string;
  };
  onExit?: () => void;
}

export function DigitalCheckFlow({
  initialCheckId,
  initialResumeToken,
  initialLead,
  onExit,
}: FlowProps) {
  const [digitalCheckId, setDigitalCheckId] = useState<string>(initialCheckId || '');
  const [resumeToken, setResumeToken] = useState<string>(initialResumeToken || '');
  const [leadInfo, setLeadInfo] = useState(initialLead || {});

  // Fases: 'intro' | 'questionnaire' | 'analyzing' | 'result'
  const [phase, setPhase] = useState<'intro' | 'questionnaire' | 'analyzing' | 'result'>(
    initialCheckId ? 'intro' : 'questionnaire'
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 a 4 (01 / 05 a 05 / 05)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({
    urgency: '3', // valor inicial equilibrado
  });
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [recommendations, setRecommendations] = useState<DigitalCheckRecommendation[]>([]);
  const [primaryOpportunity, setPrimaryOpportunity] = useState<Category>('AUTOMATE');

  // Restauração de sessão via sessionStorage ou parâmetros
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedId = initialCheckId || sessionStorage.getItem('ai_dc_id');
    const storedToken = initialResumeToken || sessionStorage.getItem('ai_dc_token');

    if (storedId && storedToken) {
      setDigitalCheckId(storedId);
      setResumeToken(storedToken);

      fetch(`/api/digital-check/${storedId}`, {
        headers: { 'x-resume-token': storedToken },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Não foi possível restaurar a sessão.');
          return (await res.json()) as Record<string, any>;
        })
        .then((data: Record<string, any>) => {
          if (data.lead) {
            setLeadInfo((prev) => ({ ...prev, ...data.lead }));
          }
          if (data.answers && Array.isArray(data.answers)) {
            const restored: Record<string, AnswerValue> = {};
            for (const a of data.answers) {
              restored[a.questionKey] = a.answerJson;
            }
            setAnswers((prev) => ({ ...prev, ...restored }));

            if (data.digitalCheck?.status === 'completed') {
              setRecommendations(data.recommendations || []);
              setPrimaryOpportunity(data.digitalCheck.primaryOpportunity || 'AUTOMATE');
              setPhase('result');
            } else {
              const answeredKeys = Object.keys(restored);
              for (let i = 0; i < DIGITAL_CHECK_STEPS.length; i++) {
                const stepKey = DIGITAL_CHECK_STEPS[i].key;
                if (!answeredKeys.includes(stepKey)) {
                  setCurrentStepIndex(i);
                  break;
                }
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [initialCheckId, initialResumeToken]);

  // Etapa atual (1 de 5)
  const currentStep: StepDefinition = DIGITAL_CHECK_STEPS[currentStepIndex] || DIGITAL_CHECK_STEPS[0];

  // Manipulação de seleção única
  const handleSingleSelect = (key: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
    setErrorMessage('');
  };

  // Manipulação de seleção múltipla
  const handleMultipleSelect = (key: string, val: string) => {
    const list = Array.isArray(answers[key]) ? [...(answers[key] as string[])] : [];
    const index = list.indexOf(val);

    if (val === 'none') {
      setAnswers((prev) => ({ ...prev, [key]: ['none'] }));
      setErrorMessage('');
      return;
    }

    const filtered = list.filter((item) => item !== 'none');
    if (index > -1) {
      filtered.splice(filtered.indexOf(val), 1);
    } else {
      filtered.push(val);
    }

    setAnswers((prev) => ({ ...prev, [key]: filtered }));
    setErrorMessage('');
  };

  // Salvar respostas da etapa atual e avançar
  const saveAndAdvance = async () => {
    // Validação da etapa atual
    if (currentStep.type === 'composite_bottleneck') {
      const textVal = typeof answers.main_bottleneck === 'string' ? answers.main_bottleneck.trim() : '';
      if (textVal.length < 5) {
        setErrorMessage('Por favor, descreva brevemente seu principal gargalo (mínimo 5 caracteres).');
        return;
      }
    } else {
      const val = answers[currentStep.key];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        setErrorMessage('Por favor, selecione ao menos uma opção para continuar.');
        return;
      }
      if (typeof val === 'string' && val.trim().length === 0) {
        setErrorMessage('Por favor, preencha este campo para continuar.');
        return;
      }
    }

    setErrorMessage('');
    setSavingStatus('saving');

    try {
      if (digitalCheckId && resumeToken) {
        // Preparar respostas a enviar
        const toSend: { key: string; value: AnswerValue }[] = [];

        if (currentStep.type === 'composite_bottleneck') {
          toSend.push({ key: 'main_bottleneck', value: answers.main_bottleneck || '' });
          toSend.push({ key: 'urgency', value: answers.urgency || '3' });
        } else {
          let finalAnswer = answers[currentStep.key];
          const otherText = otherTexts[currentStep.key];
          if (otherText && otherText.trim()) {
            if (Array.isArray(finalAnswer)) {
              finalAnswer = [...finalAnswer, `outro:${otherText.trim()}`];
            } else if (typeof finalAnswer === 'string') {
              finalAnswer = `${finalAnswer} (${otherText.trim()})`;
            }
          }
          toSend.push({ key: currentStep.key, value: finalAnswer });

          // Deduções para enriquecer o diagnóstico
          if (currentStep.key === 'lead_organization') {
            const org = String(finalAnswer);
            if (['whatsapp', 'memory', 'no_place'].includes(org)) {
              toSend.push({ key: 'follow_up', value: 'no_follow_up' });
            } else if (org === 'spreadsheet') {
              toSend.push({ key: 'follow_up', value: 'manual_track' });
            } else if (org === 'crm') {
              toSend.push({ key: 'follow_up', value: 'crm_alert' });
            }
          }
        }

        for (const item of toSend) {
          const res = await fetch(`/api/digital-check/${digitalCheckId}/answers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-resume-token': resumeToken,
            },
            body: JSON.stringify({
              questionKey: item.key,
              answerJson: item.value,
            }),
          });

          if (!res.ok) {
            const err = ((await res.json().catch(() => ({}))) || {}) as Record<string, any>;
            throw new Error(err.error || 'Erro ao salvar resposta.');
          }
        }
      }

      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 800);

      // Próxima etapa ou conclusão
      if (currentStepIndex < DIGITAL_CHECK_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
        // Rolar o corpo do modal suavemente para o topo ao avançar
        const bodyEl = document.querySelector('.dc-body');
        if (bodyEl) bodyEl.scrollTop = 0;
      } else {
        await completeDiagnostic();
      }
    } catch (err: unknown) {
      setSavingStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar progresso.');
    }
  };

  // Conclusão e geração do diagnóstico
  const completeDiagnostic = async () => {
    setPhase('analyzing');

    try {
      if (digitalCheckId && resumeToken) {
        const res = await fetch(`/api/digital-check/${digitalCheckId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-resume-token': resumeToken,
          },
        });

        if (!res.ok) {
          const err = ((await res.json().catch(() => ({}))) || {}) as Record<string, any>;
          throw new Error(err.error || 'Erro ao processar diagnóstico.');
        }

        const data = (await res.json()) as Record<string, any>;
        setRecommendations(data.recommendations || []);
        setPrimaryOpportunity(data.primaryOpportunity || 'AUTOMATE');
      }

      setTimeout(() => {
        setPhase('result');
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao concluir diagnóstico.');
      setPhase('questionnaire');
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setErrorMessage('');
      const bodyEl = document.querySelector('.dc-body');
      if (bodyEl) bodyEl.scrollTop = 0;
    }
  };

  // -----------------------------------------------------------
  // TELA DE INTRODUÇÃO
  // -----------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="dc-overlay">
        <div className="dc-modal-shell" style={{ maxWidth: '620px' }}>
          <header className="dc-header">
            <div className="dc-brand">
              !AI <span>DIGITAL CHECK</span>
            </div>
            {onExit && (
              <button className="dc-exit-btn" type="button" onClick={onExit} aria-label="Fechar">
                Fechar ×
              </button>
            )}
          </header>
          <div className="dc-body">
            <div className="dc-intro-box">
              <div className="dc-eyebrow">DIAGNÓSTICO EM 5 ETAPAS RÁPIDAS</div>
              <h1 className="dc-title">Entendi. Vamos descobrir onde está o gargalo.</h1>
              <p className="dc-step-desc">
                Organizamos a análise em 5 perguntas práticas para mapear seus canais, rotina comercial e automações. Leva menos de 2 minutos.
              </p>
              <button
                className="button"
                type="button"
                onClick={() => setPhase('questionnaire')}
                style={{ padding: '16px 32px', fontSize: '15px', marginTop: '12px' }}
              >
                Começar Digital Check <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // TELA DE TRANSIÇÃO / ANÁLISE
  // -----------------------------------------------------------
  if (phase === 'analyzing') {
    return (
      <div className="dc-overlay">
        <div className="dc-modal-shell" style={{ maxWidth: '580px' }}>
          <div className="dc-body">
            <div className="dc-complete-card">
              <div className="dc-complete-badge">CHECK COMPLETE ✓</div>
              <h2 className="dc-title">I found a few things.</h2>
              <p className="dc-step-desc">
                Cruzando suas respostas com as quatro frentes da nossa engenharia...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // TELA DE RESULTADO
  // -----------------------------------------------------------
  if (phase === 'result') {
    const count = recommendations.length;
    const whatsappMsg = encodeURIComponent(
      `Olá! Concluí meu !AI Digital Check para a ${leadInfo.company || 'minha empresa'}. Gostaria de entender o plano de ação sobre as oportunidades encontradas (${primaryOpportunity}).`
    );
    const whatsappUrl = config.contact.whatsapp
      ? `https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`
      : '#contato';

    return (
      <div className="dc-overlay">
        <div className="dc-modal-shell" style={{ maxWidth: '820px' }}>
          <header className="dc-header">
            <div className="dc-brand">
              !AI <span>DIGITAL CHECK</span>
            </div>
            {onExit && (
              <button className="dc-exit-btn" type="button" onClick={onExit} aria-label="Voltar ao site">
                Voltar ao site ×
              </button>
            )}
          </header>

          <div className="dc-body">
            <div className="dc-step-header">
              <div className="dc-eyebrow">DIAGNÓSTICO CONCLUÍDO</div>
              <h1 className="dc-title">
                Encontramos {count} {count === 1 ? 'oportunidade' : 'oportunidades'} na sua operação.
              </h1>
              <p className="dc-step-desc">
                Análise indicativa das prioridades identificadas para a <strong>{leadInfo.company || 'sua empresa'}</strong>.
              </p>
            </div>

            <div className="dc-recs-grid">
              {recommendations.map((rec, idx) => (
                <article key={rec.id || idx} className={`dc-rec-card ${rec.priority}`}>
                  <div className="dc-rec-meta">
                    <span className="dc-rec-category">{rec.category}</span>
                    <span className="dc-rec-priority">
                      Prioridade {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                  <h3 className="dc-rec-title">{rec.title}</h3>
                  <p className="dc-rec-desc">{rec.description}</p>
                </article>
              ))}
            </div>

            <div className="dc-cta-box">
              <div className="dc-eyebrow" style={{ color: 'var(--lime)' }}>PRÓXIMO PASSO</div>
              <h3>Agora sabemos onde olhar.</h3>
              <p>
                Podemos transformar esse diagnóstico em um plano de ação concreto, com escopo e prazos claros para o seu negócio.
              </p>
              <div className="dc-cta-actions">
                <a className="button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Quero conversar sobre isso <ArrowIcon />
                </a>
                {onExit && (
                  <button className="button outline" type="button" onClick={onExit}>
                    Voltar ao site
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // QUESTIONÁRIO PROGRESSIVO LIMPO (01 / 05 a 05 / 05 - SEM BLOCOS)
  // -----------------------------------------------------------
  const progressPercent = ((currentStepIndex + 1) / DIGITAL_CHECK_STEPS.length) * 100;
  const currentVal = answers[currentStep.key];
  const selectedUrgency = String(answers.urgency || '3');
  const activeUrgencyOption = URGENCY_SCALE_OPTIONS.find((o) => o.value === selectedUrgency) || URGENCY_SCALE_OPTIONS[2];

  return (
    <div className="dc-overlay">
      <div className="dc-modal-shell">
        <header className="dc-header">
          <div className="dc-brand">
            !AI <span>DIGITAL CHECK</span>
          </div>

          <div className="dc-status-bar">
            {savingStatus === 'saving' && <span className="dc-saving-badge">SALVANDO...</span>}
            {savingStatus === 'saved' && <span className="dc-saving-badge saved">SALVO ✓</span>}
            {savingStatus === 'error' && <span className="dc-saving-badge error">ERRO AO SALVAR</span>}

            {onExit && (
              <button className="dc-exit-btn" type="button" onClick={onExit} aria-label="Sair">
                Sair
              </button>
            )}
          </div>
        </header>

        {/* Barra de Progresso Canônica em 5 Etapas */}
        <div className="dc-progress-wrapper">
          <div className="dc-progress-meta">
            <span>ETAPA {currentStep.stepNumberStr}</span>
            <strong className="dc-progress-label">{currentStep.eyebrow.split('•')[1]?.trim() || ''}</strong>
          </div>
          <div className="dc-progress-track">
            <div className="dc-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="dc-body">
          <div className="dc-step-header">
            <div className="dc-eyebrow">{currentStep.eyebrow}</div>
            <h2 className="dc-title">{currentStep.title}</h2>
            <p className="dc-step-desc">{currentStep.description}</p>
          </div>

          {/* Opções de Seleção Única */}
          {currentStep.type === 'single' && (
            <div className="dc-grid-options" role="radiogroup">
              {currentStep.options?.map((opt) => {
                const isSelected = currentVal === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dc-card-option single ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect(currentStep.key, opt.value)}
                  >
                    <div className="dc-card-option-left">
                      <div className="dc-opt-indicator">{isSelected && '•'}</div>
                      <span>{opt.label}</span>
                    </div>
                    {opt.nexNote && <span className="dc-nex-tag">{opt.nexNote}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Opções de Seleção Múltipla */}
          {currentStep.type === 'multiple' && (
            <div className="dc-grid-options" role="group">
              {currentStep.options?.map((opt) => {
                const isSelected = Array.isArray(currentVal) && currentVal.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    className={`dc-card-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleMultipleSelect(currentStep.key, opt.value)}
                  >
                    <div className="dc-card-option-left">
                      <div className="dc-opt-indicator">{isSelected && '✓'}</div>
                      <span>{opt.label}</span>
                    </div>
                    {opt.nexNote && <span className="dc-nex-tag">{opt.nexNote}</span>}
                  </button>
                );
              })}

              {/* Campo "Outro" quando selecionado */}
              {currentStep.hasOther && Array.isArray(currentVal) && currentVal.includes('other') && (
                <div className="dc-other-box">
                  <input
                    type="text"
                    className="dc-other-input"
                    placeholder={currentStep.otherPlaceholder || 'Descreva brevemente'}
                    value={otherTexts[currentStep.key] || ''}
                    onChange={(e) =>
                      setOtherTexts((prev) => ({
                        ...prev,
                        [currentStep.key]: e.target.value,
                      }))
                    }
                    maxLength={160}
                  />
                </div>
              )}
            </div>
          )}

          {/* Etapa 5: Gargalo Principal + Escala de Urgência Integrada (sem blocos) */}
          {currentStep.type === 'composite_bottleneck' && (
            <div className="dc-bottleneck-section">
              <div className="dc-textarea-wrapper">
                <textarea
                  className="dc-textarea"
                  rows={4}
                  placeholder="Conte sobre a tarefa, processo ou situação que mais toma tempo, gera retrabalho ou faz oportunidades se perderem."
                  value={typeof answers.main_bottleneck === 'string' ? answers.main_bottleneck : ''}
                  maxLength={1000}
                  onChange={(e) => {
                    setAnswers((prev) => ({
                      ...prev,
                      main_bottleneck: e.target.value,
                    }));
                    setErrorMessage('');
                  }}
                />
                <div className="dc-char-count">
                  {typeof answers.main_bottleneck === 'string' ? answers.main_bottleneck.length : 0} / 1000 caracteres
                </div>
              </div>

              <div className="dc-urgency-wrapper">
                <div className="dc-urgency-heading">
                  <span className="dc-urgency-title">Quanto isso está atrapalhando sua operação hoje?</span>
                  <span className="dc-urgency-status">
                    Nível {activeUrgencyOption.num}: <strong>{activeUrgencyOption.label}</strong>
                  </span>
                </div>

                <div className="dc-urgency-scale" role="radiogroup" aria-label="Escala de urgência de 1 a 5">
                  {URGENCY_SCALE_OPTIONS.map((opt) => {
                    const isSelected = selectedUrgency === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`dc-urgency-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSingleSelect('urgency', opt.value)}
                        title={opt.label}
                      >
                        <span className="dc-urgency-num">{opt.num}</span>
                        <span className="dc-urgency-btn-label">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ações do Modal */}
        <footer className="dc-footer">
          {currentStepIndex > 0 ? (
            <button className="dc-back-btn" type="button" onClick={handleBack}>
              ← Voltar
            </button>
          ) : (
            <div className="dc-footer-spacer" />
          )}

          {errorMessage && (
            <div className="dc-error-msg" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            className="button dc-continue-btn"
            type="button"
            onClick={saveAndAdvance}
            disabled={savingStatus === 'saving'}
          >
            {savingStatus === 'saving'
              ? 'Salvando...'
              : currentStepIndex === DIGITAL_CHECK_STEPS.length - 1
              ? 'Finalizar Check'
              : 'Continuar'}{' '}
            <ArrowIcon />
          </button>
        </footer>
      </div>
    </div>
  );
}
