'use client';

import { ArrowIcon } from '../arrow-icon';
import { useEffect, useState } from 'react';
import { DIGITAL_CHECK_QUESTIONS, TOTAL_STEPS } from '@/lib/digital-check/questions';
import type {
  AnswerValue,
  Category,
  DigitalCheckRecommendation,
  QuestionDefinition,
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

  // currentStepIndex: 0 a 9 (correspondente a 01 / 10 a 10 / 10)
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({
    urgency: '3', // valor neutro inicial
  });
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [recommendations, setRecommendations] = useState<DigitalCheckRecommendation[]>([]);
  const [primaryOpportunity, setPrimaryOpportunity] = useState<Category>('AUTOMATE');

  // Restauração de sessão via sessionStorage ou parâmetros (PostgreSQL como fonte da verdade - ITEM 2 e 35)
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
            } else if (typeof data.digitalCheck?.currentStep === 'number') {
              // PostgreSQL determina a próxima etapa a ser exibida (ITEM 2)
              const nextIndex = Math.min(
                TOTAL_STEPS - 1,
                Math.max(0, data.digitalCheck.currentStep - 1)
              );
              setCurrentStepIndex(nextIndex);
            }
          }
        })
        .catch(() => {
          // Em falha de restauração, mantém o estado padrão limpo
        });
    }
  }, [initialCheckId, initialResumeToken]);

  // Pergunta atual (1 de 10)
  const currentQuestion: QuestionDefinition =
    DIGITAL_CHECK_QUESTIONS[currentStepIndex] || DIGITAL_CHECK_QUESTIONS[0];

  // Manipulação de seleção única
  const handleSingleSelect = (key: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
    setErrorMessage('');
  };

  // Manipulação de seleção múltipla
  const handleMultipleSelect = (key: string, val: string) => {
    const list = Array.isArray(answers[key]) ? [...(answers[key] as string[])] : [];
    const index = list.indexOf(val);

    if (val === 'none' || val === 'no_idea') {
      setAnswers((prev) => ({ ...prev, [key]: [val] }));
      setErrorMessage('');
      return;
    }

    const filtered = list.filter((item) => item !== 'none' && item !== 'no_idea');
    if (index > -1) {
      filtered.splice(filtered.indexOf(val), 1);
    } else {
      filtered.push(val);
    }

    setAnswers((prev) => ({ ...prev, [key]: filtered }));
    setErrorMessage('');
  };

  // Salvar resposta da etapa atual e avançar (ITEM 2 e 39)
  const saveAndAdvance = async () => {
    const val = answers[currentQuestion.key];

    // Validações locais antes da requisição
    if (currentQuestion.type === 'textarea') {
      const textVal = typeof val === 'string' ? val.trim() : '';
      if (textVal.length < 5) {
        setErrorMessage('Por favor, descreva seu desafio com pelo menos 5 caracteres.');
        return;
      }
    } else if (currentQuestion.type === 'scale') {
      if (!val) {
        setErrorMessage('Por favor, selecione um nível de urgência de 1 a 5.');
        return;
      }
    } else {
      if (!val || (Array.isArray(val) && val.length === 0)) {
        setErrorMessage('Por favor, selecione ao menos uma opção para continuar.');
        return;
      }
      if (typeof val === 'string' && val.trim().length === 0) {
        setErrorMessage('Por favor, selecione uma opção para continuar.');
        return;
      }
    }

    setErrorMessage('');
    setSavingStatus('saving');

    try {
      if (digitalCheckId && resumeToken) {
        let finalAnswer = answers[currentQuestion.key];
        const otherText = otherTexts[currentQuestion.key];
        if (otherText && otherText.trim()) {
          if (Array.isArray(finalAnswer)) {
            finalAnswer = [...finalAnswer, `outro:${otherText.trim()}`];
          } else if (typeof finalAnswer === 'string') {
            finalAnswer = `${finalAnswer} (${otherText.trim()})`;
          }
        }

        // Calcula a próxima etapa (1 a 10)
        const nextStepToPersist = Math.min(TOTAL_STEPS, currentStepIndex + 2);

        const res = await fetch(`/api/digital-check/${digitalCheckId}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-resume-token': resumeToken,
          },
          body: JSON.stringify({
            questionKey: currentQuestion.key,
            answerJson: finalAnswer,
            nextStep: nextStepToPersist,
          }),
        });

        if (!res.ok) {
          const errData = ((await res.json().catch(() => ({}))) || {}) as Record<string, any>;
          throw new Error(errData.error || 'Falha ao salvar resposta. Tente novamente.');
        }
      }

      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 600);

      // Avança para a próxima etapa ou finaliza
      if (currentStepIndex < TOTAL_STEPS - 1) {
        setCurrentStepIndex((prev) => prev + 1);
        const bodyEl = document.querySelector('.dc-body');
        if (bodyEl) bodyEl.scrollTop = 0;
      } else {
        await completeDiagnostic();
      }
    } catch (err: unknown) {
      setSavingStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao salvar resposta. Tente novamente.'
      );
    }
  };

  // Finalização do diagnóstico via POST /complete atômico
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
          const errData = ((await res.json().catch(() => ({}))) || {}) as Record<string, any>;
          throw new Error(errData.error || 'Erro ao processar diagnóstico.');
        }

        const data = (await res.json()) as Record<string, any>;
        setRecommendations(data.recommendations || []);
        setPrimaryOpportunity(data.primaryOpportunity || 'AUTOMATE');
      }

      setTimeout(() => {
        setPhase('result');
      }, 900);
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
              <div className="dc-eyebrow">DIAGNÓSTICO EM 10 ETAPAS RÁPIDAS</div>
              <h1 className="dc-title">Entendi. Vamos descobrir onde está o gargalo.</h1>
              <p className="dc-step-desc">
                Organizamos a análise em 10 perguntas práticas para mapear seus canais, rotina comercial e automações. Leva menos de 2 minutos.
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
  // QUESTIONÁRIO PROGRESSIVO (01 / 10 a 10 / 10 - 1 PERGUNTA POR TELA, SEM BLOCOS)
  // -----------------------------------------------------------
  const progressPercent = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;
  const currentVal = answers[currentQuestion.key];

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

        {/* Barra de Progresso Canônica em 10 Etapas (ITEM 41) */}
        <div className="dc-progress-wrapper">
          <div className="dc-progress-meta">
            <span>ETAPA {currentQuestion.stepNumberStr}</span>
            <strong className="dc-progress-label">
              {currentQuestion.eyebrow.split('•')[1]?.trim() || ''}
            </strong>
          </div>
          <div className="dc-progress-track">
            <div className="dc-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="dc-body">
          <div className="dc-step-header">
            <div className="dc-eyebrow">{currentQuestion.eyebrow}</div>
            <h2 className="dc-title">{currentQuestion.question}</h2>
            {currentQuestion.description && (
              <p className="dc-step-desc">{currentQuestion.description}</p>
            )}
            {currentQuestion.context && (
              <div className="dc-block-context" style={{ marginTop: '10px' }}>
                {currentQuestion.context}
              </div>
            )}
          </div>

          {/* 1. Seleção Única (ex: lead_organization, follow_up, system_integration) */}
          {currentQuestion.type === 'single' && (
            <div className="dc-grid-options" role="radiogroup">
              {currentQuestion.options?.map((opt) => {
                const isSelected = currentVal === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dc-card-option single ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect(currentQuestion.key, opt.value)}
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

          {/* 2. Seleção Múltipla (ex: lead_sources, lead_handling, manual_tasks, website_function, ai_opportunity) */}
          {currentQuestion.type === 'multiple' && (
            <div className="dc-grid-options" role="group">
              {currentQuestion.options?.map((opt) => {
                const isSelected = Array.isArray(currentVal) && currentVal.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    className={`dc-card-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleMultipleSelect(currentQuestion.key, opt.value)}
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
              {currentQuestion.hasOther && Array.isArray(currentVal) && currentVal.includes('other') && (
                <div className="dc-other-box">
                  <input
                    type="text"
                    className="dc-other-input"
                    placeholder={currentQuestion.otherPlaceholder || 'Descreva brevemente'}
                    value={otherTexts[currentQuestion.key] || ''}
                    onChange={(e) =>
                      setOtherTexts((prev) => ({
                        ...prev,
                        [currentQuestion.key]: e.target.value,
                      }))
                    }
                    maxLength={160}
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Textarea Aberta (09 / 10 • main_bottleneck) */}
          {currentQuestion.type === 'textarea' && (
            <div className="dc-textarea-wrapper">
              <textarea
                className="dc-textarea"
                rows={4}
                placeholder={currentQuestion.placeholder}
                value={typeof currentVal === 'string' ? currentVal : ''}
                maxLength={currentQuestion.maxLength || 1000}
                onChange={(e) => {
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.key]: e.target.value,
                  }));
                  setErrorMessage('');
                }}
              />
              <div className="dc-char-count">
                {typeof currentVal === 'string' ? currentVal.length : 0} / {currentQuestion.maxLength || 1000} caracteres
              </div>
            </div>
          )}

          {/* 4. Escala de Urgência (10 / 10 • urgency de 1 a 5) */}
          {currentQuestion.type === 'scale' && (
            <div className="dc-urgency-section">
              <div className="dc-scale-grid" role="radiogroup">
                {currentQuestion.options?.map((opt) => {
                  const isSelected = String(currentVal) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`dc-scale-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSingleSelect(currentQuestion.key, opt.value)}
                    >
                      <span className="dc-scale-num">{opt.value}</span>
                      <span className="dc-scale-label">{opt.label.replace(/^\d\s*—\s*/, '')}</span>
                    </button>
                  );
                })}
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
              : currentStepIndex === TOTAL_STEPS - 1
              ? 'Finalizar Check'
              : 'Continuar'}{' '}
            <ArrowIcon />
          </button>
        </footer>
      </div>
    </div>
  );
}
