'use client';

import { ArrowIcon } from '../arrow-icon';
import { useEffect, useState } from 'react';
import { DIGITAL_CHECK_STEPS, DIGITAL_CHECK_QUESTIONS } from '@/lib/digital-check/questions';
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

  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 a 4 (correspondente a 01 / 05 a 05 / 05)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
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
            setAnswers(restored);

            if (data.digitalCheck?.status === 'completed') {
              setRecommendations(data.recommendations || []);
              setPrimaryOpportunity(data.digitalCheck.primaryOpportunity || 'AUTOMATE');
              setPhase('result');
            } else {
              // Calcula etapa baseada nas perguntas já respondidas
              const answeredKeys = Object.keys(restored);
              for (let i = 0; i < DIGITAL_CHECK_STEPS.length; i++) {
                const stepQuestions = DIGITAL_CHECK_STEPS[i].questions;
                const allAnswered = stepQuestions.every((q) => answeredKeys.includes(q.key));
                if (!allAnswered) {
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
  const currentStep = DIGITAL_CHECK_STEPS[currentStepIndex];

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

  // Salvar respostas do bloco atual e avançar
  const saveAndAdvance = async () => {
    // Validar se todas as perguntas do bloco atual foram respondidas
    for (const q of currentStep.questions) {
      const val = answers[q.key];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        setErrorMessage(`Por favor, responda o bloco: "${q.question}"`);
        return;
      }
      if (typeof val === 'string' && val.trim().length === 0) {
        setErrorMessage(`Por favor, preencha o bloco: "${q.question}"`);
        return;
      }
    }

    setErrorMessage('');
    setSavingStatus('saving');

    try {
      if (digitalCheckId && resumeToken) {
        // Envia as respostas do passo atual
        for (const q of currentStep.questions) {
          let finalAnswer = answers[q.key];
          const otherText = otherTexts[q.key];
          if (otherText && otherText.trim()) {
            if (Array.isArray(finalAnswer)) {
              finalAnswer = [...finalAnswer, `outro:${otherText.trim()}`];
            } else if (typeof finalAnswer === 'string') {
              finalAnswer = `${finalAnswer} (${otherText.trim()})`;
            }
          }

          await fetch(`/api/digital-check/${digitalCheckId}/answers`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-resume-token': resumeToken,
            },
            body: JSON.stringify({
              questionKey: q.key,
              answerJson: finalAnswer,
            }),
          });
        }
      }

      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 1000);

      // Avançar etapa ou concluir
      if (currentStepIndex < DIGITAL_CHECK_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        completeCheck();
      }
    } catch {
      setSavingStatus('error');
      setErrorMessage('Não conseguimos salvar este bloco. Verifique sua conexão e tente novamente.');
    }
  };

  // Finalização do check
  const completeCheck = async () => {
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

        if (res.ok) {
          const data = (await res.json()) as Record<string, any>;
          setRecommendations(data.recommendations || []);
          setPrimaryOpportunity(data.primaryOpportunity || 'AUTOMATE');
        }
      }

      setTimeout(() => {
        setPhase('result');
      }, 1400);
    } catch {
      setTimeout(() => {
        setPhase('result');
      }, 1400);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setErrorMessage('');
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Formatação com dois dígitos
  const stepNumberStr = `0${currentStepIndex + 1} / 05`;

  // -----------------------------------------------------------
  // TELA DE INTRODUÇÃO
  // -----------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="dc-overlay">
        <div className="dc-modal-shell" style={{ maxWidth: '640px' }}>
          <header className="dc-header">
            <div className="dc-brand">
              !AI <span>DIGITAL CHECK</span>
            </div>
            {onExit && (
              <button className="dc-exit-btn" type="button" onClick={onExit}>
                Fechar ×
              </button>
            )}
          </header>
          <div className="dc-body">
            <div className="dc-intro-box">
              <div className="dc-eyebrow">DIAGNÓSTICO EM 5 BLOCOS RÁPIDOS</div>
              <h1 className="dc-title">Entendi. Vamos descobrir onde está o gargalo.</h1>
              <p className="dc-step-desc">
                Organizamos a análise em 5 etapas práticas para mapear seus canais, rotina comercial e automações. Leva menos de 2 minutos.
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
        <div className="dc-modal-shell" style={{ maxWidth: '860px' }}>
          <header className="dc-header">
            <div className="dc-brand">
              !AI <span>DIGITAL CHECK</span>
            </div>
            {onExit && (
              <button className="dc-exit-btn" type="button" onClick={onExit}>
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
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
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
  // QUESTIONÁRIO PROGRESSIVO (EM BLOCOS ORGANIZADOS: 01 / 05 a 05 / 05)
  // -----------------------------------------------------------
  const progressPercent = ((currentStepIndex + 1) / DIGITAL_CHECK_STEPS.length) * 100;

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
              <button className="dc-exit-btn" type="button" onClick={onExit}>
                Sair
              </button>
            )}
          </div>
        </header>

        {/* Barra de Progresso Canônica em 5 Etapas */}
        <div className="dc-progress-wrapper">
          <div className="dc-progress-meta">
            <span>ETAPA {stepNumberStr}</span>
            <strong>{currentStep.title}</strong>
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

          {/* Renderização dos Blocos da Etapa */}
          <div className="dc-blocks-container">
            {currentStep.questions.map((q: QuestionDefinition, qIdx: number) => {
              const val = answers[q.key];

              return (
                <div key={q.key} className="dc-block">
                  <div className="dc-block-header">
                    <h3 className="dc-block-title">
                      <span className="dc-block-badge">Bloco {qIdx + 1}</span>
                      {q.question}
                    </h3>
                    {q.description && <p className="dc-block-desc">{q.description}</p>}
                    {q.context && <div className="dc-block-context">{q.context}</div>}
                  </div>

                  {/* Pergunta Single Choice */}
                  {q.type === 'single' && (
                    <div className="dc-grid-options" role="radiogroup">
                      {q.options?.map((opt) => {
                        const isSelected = val === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`dc-card-option single ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSingleSelect(q.key, opt.value)}
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

                  {/* Pergunta Multiple Choice */}
                  {q.type === 'multiple' && (
                    <div className="dc-grid-options" role="group">
                      {q.options?.map((opt) => {
                        const isSelected = Array.isArray(val) && val.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            className={`dc-card-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleMultipleSelect(q.key, opt.value)}
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
                      {q.hasOther && Array.isArray(val) && val.includes('other') && (
                        <div className="dc-other-box">
                          <input
                            type="text"
                            className="dc-other-input"
                            placeholder={q.otherPlaceholder || 'Descreva brevemente'}
                            value={otherTexts[q.key] || ''}
                            onChange={(e) =>
                              setOtherTexts((prev) => ({
                                ...prev,
                                [q.key]: e.target.value,
                              }))
                            }
                            maxLength={160}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Escala de Urgência (1 a 5) em Blocos Horizontais */}
                  {q.type === 'scale' && (
                    <div className="dc-scale-grid" role="radiogroup">
                      {q.options?.map((opt) => {
                        const isSelected = val === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`dc-scale-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSingleSelect(q.key, opt.value)}
                          >
                            <span className="dc-scale-num">{opt.value}</span>
                            <span className="dc-scale-label">{opt.label.replace(/^\d\s*—\s*/, '')}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Textarea de Gargalo Principal */}
                  {q.type === 'textarea' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        className="dc-textarea"
                        rows={4}
                        placeholder={q.placeholder}
                        value={typeof val === 'string' ? val : ''}
                        maxLength={q.maxLength || 1000}
                        onChange={(e) => {
                          setAnswers((prev) => ({
                            ...prev,
                            [q.key]: e.target.value,
                          }));
                          setErrorMessage('');
                        }}
                      />
                      <div className="dc-char-count">
                        {typeof val === 'string' ? val.length : 0} / {q.maxLength || 1000} caracteres
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé de Ações do Modal */}
        <footer className="dc-footer">
          {currentStepIndex > 0 ? (
            <button className="dc-back-btn" type="button" onClick={handleBack}>
              ← Bloco anterior
            </button>
          ) : (
            <div />
          )}

          {errorMessage && (
            <div className="dc-error-msg" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            className="button"
            type="button"
            onClick={saveAndAdvance}
            disabled={savingStatus === 'saving'}
            style={{ padding: '14px 28px' }}
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
