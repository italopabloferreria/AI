'use client';

import { ArrowIcon } from '../arrow-icon';
import { useCallback, useEffect, useState } from 'react';
import { DIGITAL_CHECK_QUESTIONS } from '@/lib/digital-check/questions';
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

  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 a 9 (correspondente a 1 a 10)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [recommendations, setRecommendations] = useState<DigitalCheckRecommendation[]>([]);
  const [primaryOpportunity, setPrimaryOpportunity] = useState<Category>('AUTOMATE');

  // 1. Restauração de sessão via sessionStorage ou parâmetros
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedId = initialCheckId || sessionStorage.getItem('ai_dc_id');
    const storedToken = initialResumeToken || sessionStorage.getItem('ai_dc_token');

    if (storedId && storedToken) {
      setDigitalCheckId(storedId);
      setResumeToken(storedToken);

      // Busca dados salvos na API
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

            // Determinar etapa a retomar
            if (data.digitalCheck?.status === 'completed') {
              setRecommendations(data.recommendations || []);
              setPrimaryOpportunity(data.digitalCheck.primaryOpportunity || 'AUTOMATE');
              setPhase('result');
            } else {
              const answeredCount = data.answers.length;
              const nextIndex = Math.min(answeredCount, DIGITAL_CHECK_QUESTIONS.length - 1);
              setCurrentStepIndex(nextIndex);
            }
          }
        })
        .catch(() => {
          // Erro de restauração silencioso em caso de rede ou token inválido
        });
    }
  }, [initialCheckId, initialResumeToken]);

  // Pergunta atual
  const currentQuestion: QuestionDefinition = DIGITAL_CHECK_QUESTIONS[currentStepIndex];

  // Tratamento adaptativo da Pergunta 07 caso não haja site informado
  const adaptedQuestionText =
    currentQuestion.key === 'website_function' && !leadInfo.websiteOrInstagram
      ? 'Você possui site atualmente ou como funciona sua presença digital?'
      : currentQuestion.question;

  // Valor atual da resposta
  const currentValue = answers[currentQuestion.key];

  // Manipulação de seleção única
  const handleSingleSelect = (val: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: val }));
    setErrorMessage('');
  };

  // Manipulação de seleção múltipla
  const handleMultipleSelect = (val: string) => {
    const list = Array.isArray(currentValue) ? [...(currentValue as string[])] : [];
    const index = list.indexOf(val);

    if (val === 'none') {
      // Se selecionou 'nenhuma', desmarca as outras
      setAnswers((prev) => ({ ...prev, [currentQuestion.key]: ['none'] }));
      return;
    }

    const filtered = list.filter((item) => item !== 'none');
    if (index > -1) {
      filtered.splice(filtered.indexOf(val), 1);
    } else {
      filtered.push(val);
    }

    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: filtered }));
    setErrorMessage('');
  };

  // Salvar resposta atual e avançar
  const saveAndAdvance = async () => {
    // Validação da etapa
    if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) {
      setErrorMessage('Selecione pelo menos uma opção para continuar.');
      return;
    }
    if (typeof currentValue === 'string' && currentValue.trim().length === 0) {
      setErrorMessage('Por favor, preencha o campo para continuar.');
      return;
    }

    setErrorMessage('');
    setSavingStatus('saving');

    // Montar payload com eventual texto "Outro"
    let finalAnswer = currentValue;
    const otherText = otherTexts[currentQuestion.key];
    if (otherText && otherText.trim()) {
      if (Array.isArray(currentValue)) {
        finalAnswer = [...currentValue, `other_detail:${otherText.trim()}`];
      } else if (typeof currentValue === 'string') {
        finalAnswer = `${currentValue} (${otherText.trim()})`;
      }
    }

    // Persistência progressiva via PATCH /api/digital-check/:id/answers
    try {
      if (digitalCheckId && resumeToken) {
        const res = await fetch(`/api/digital-check/${digitalCheckId}/answers`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-resume-token': resumeToken,
          },
          body: JSON.stringify({
            questionKey: currentQuestion.key,
            answerJson: finalAnswer,
          }),
        });

        if (!res.ok) {
          const errData = ((await res.json().catch(() => ({}))) || {}) as Record<string, any>;
          throw new Error(errData.error || 'Não conseguimos salvar esta resposta.');
        }
      }

      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 1200);

      // Avançar para a próxima pergunta ou finalizar
      if (currentStepIndex < DIGITAL_CHECK_QUESTIONS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // Última etapa concluída -> Transição para Análise
        completeCheck();
      }
    } catch (err: unknown) {
      setSavingStatus('error');
      setErrorMessage(
        'Não conseguimos salvar esta resposta. Verifique sua conexão e tente novamente.'
      );
    }
  };

  // Finalização do Digital Check
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

        if (!res.ok) {
          throw new Error('Falha ao gerar recomendações');
        }

        const data = (await res.json()) as Record<string, any>;
        setRecommendations(data.recommendations || []);
        setPrimaryOpportunity(data.primaryOpportunity || 'AUTOMATE');
      }

      // Pequena pausa para a transição visual elegante da marca
      setTimeout(() => {
        setPhase('result');
      }, 1400);
    } catch {
      // Fallback em caso de erro de rede
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

  // Formatar número do passo com zero à esquerda (01 a 10)
  const formatStep = (index: number) => {
    const num = index + 1;
    return num < 10 ? `0${num}` : `${num}`;
  };

  // -----------------------------------------------------------
  // TELA DE INTRODUÇÃO
  // -----------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="dc-overlay">
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

        <main className="dc-main">
          <div className="dc-step-card" style={{ textAlign: 'center', maxWidth: '640px' }}>
            <div className="dc-eyebrow" style={{ justifyContent: 'center' }}>
              DIAGNÓSTICO COMERCIAL & OPERACIONAL
            </div>
            <h1 className="dc-title">Entendi. Vamos descobrir onde está o gargalo.</h1>
            <p className="dc-description" style={{ margin: '0 auto 36px' }}>
              Leva cerca de 3 minutos. Suas respostas nos ajudam a identificar exatamente quais
              processos podem ser integrados, automatizados ou estruturados.
            </p>
            <button
              className="button"
              type="button"
              onClick={() => setPhase('questionnaire')}
              style={{ padding: '18px 36px', fontSize: '16px' }}
            >
              Começar Digital Check <ArrowIcon />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // -----------------------------------------------------------
  // TELA DE TRANSIÇÃO / ANÁLISE
  // -----------------------------------------------------------
  if (phase === 'analyzing') {
    return (
      <div className="dc-overlay">
        <main className="dc-main">
          <div className="dc-complete-card">
            <div className="dc-complete-badge">CHECK COMPLETE ✓</div>
            <h2 className="dc-title">I found a few things.</h2>
            <p className="dc-description" style={{ margin: '0 auto' }}>
              Cruzando suas respostas com as quatro frentes da nossa engenharia...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // -----------------------------------------------------------
  // TELA DE RESULTADO FINAL
  // -----------------------------------------------------------
  if (phase === 'result') {
    const count = recommendations.length;
    const whatsappMsg = encodeURIComponent(
      `Olá! Concluí meu !AI Digital Check para a ${leadInfo.company || 'minha empresa'}. Gostaria de conversar sobre as oportunidades identificadas (${primaryOpportunity}).`
    );
    const whatsappUrl = config.contact.whatsapp
      ? `https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`
      : '#contato';

    return (
      <div className="dc-overlay">
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

        <main className="dc-main">
          <div className="dc-results-wrapper">
            <div className="dc-results-header">
              <div className="dc-eyebrow">DIAGNÓSTICO CONCLUÍDO</div>
              <h1 className="dc-results-count">
                Encontramos {count} {count === 1 ? 'oportunidade' : 'oportunidades'} na sua operação.
              </h1>
              <p className="dc-description">
                Resultado indicativo baseado nas respostas fornecidas para a{' '}
                <strong>{leadInfo.company || 'sua empresa'}</strong>.
              </p>
            </div>

            <div className="dc-recs-grid">
              {recommendations.map((rec, idx) => (
                <article key={rec.id || idx} className={`dc-rec-card ${rec.priority}`}>
                  <div className="dc-rec-meta">
                    <span className="dc-rec-category">{rec.category}</span>
                    <span className={`dc-rec-priority ${rec.priority}`}>
                      Prioridade {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                  <h3 className="dc-rec-title">{rec.title}</h3>
                  <p className="dc-rec-desc">{rec.description}</p>
                </article>
              ))}
            </div>

            <div className="dc-cta-box">
              <div className="dc-eyebrow">PRÓXIMO PASSO</div>
              <h3>Agora sabemos onde olhar.</h3>
              <p>
                Se quiser, podemos transformar esse diagnóstico em um plano de ação concreto, com
                escopo e cronograma definidos para o seu negócio.
              </p>
              <div className="dc-cta-actions">
                <a
                  className="button"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
        </main>
      </div>
    );
  }

  // -----------------------------------------------------------
  // QUESTIONÁRIO PROGRESSIVO (ETAPAS 01 A 10)
  // -----------------------------------------------------------
  const progressPercent = ((currentStepIndex + 1) / DIGITAL_CHECK_QUESTIONS.length) * 100;

  // Microcopy contextual do NEX
  let nexMotto: string | null = null;
  if (currentQuestion.key === 'manual_tasks' && Array.isArray(currentValue) && currentValue.length >= 4) {
    nexMotto = 'we need to talk.';
  }

  return (
    <div className="dc-overlay">
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

      <main className="dc-main">
        {/* Barra de Progresso Canônica: 01 / 10 até 10 / 10 */}
        <div className="dc-progress-wrapper">
          <div className="dc-progress-meta">
            <span>ETAPA {formatStep(currentStepIndex)} / 10</span>
            <strong>{currentQuestion.key.replace('_', ' ')}</strong>
          </div>
          <div className="dc-progress-track">
            <div className="dc-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="dc-step-card" key={currentQuestion.key}>
          <div className="dc-eyebrow">
            {formatStep(currentStepIndex)} / 10 {nexMotto && `• NEX: "${nexMotto}"`}
          </div>

          <h2 className="dc-title">{adaptedQuestionText}</h2>

          {currentQuestion.description && (
            <p className="dc-description">{currentQuestion.description}</p>
          )}

          {currentQuestion.context && (
            <div className="dc-context-box">{currentQuestion.context}</div>
          )}

          {errorMessage && (
            <div className="dc-error-banner" role="alert">
              <span>{errorMessage}</span>
              {savingStatus === 'error' && (
                <button
                  type="button"
                  className="button small outline"
                  onClick={saveAndAdvance}
                  style={{ padding: '6px 12px' }}
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {/* Renderização conforme o tipo da pergunta */}
          {currentQuestion.type === 'single' && (
            <div className="dc-options-grid" role="radiogroup">
              {currentQuestion.options?.map((opt) => {
                const isSelected = currentValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dc-option single ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect(opt.value)}
                  >
                    <div className="dc-option-content">
                      <div className="dc-indicator">{isSelected && '•'}</div>
                      <span>{opt.label}</span>
                    </div>
                    {opt.nexNote && <span className="dc-nex-note">{opt.nexNote}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'multiple' && (
            <div className="dc-options-grid" role="group">
              {currentQuestion.options?.map((opt) => {
                const isSelected =
                  Array.isArray(currentValue) && currentValue.includes(opt.value);
                return (
                  <div key={opt.value}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      className={`dc-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleMultipleSelect(opt.value)}
                    >
                      <div className="dc-option-content">
                        <div className="dc-indicator">{isSelected && '✓'}</div>
                        <span>{opt.label}</span>
                      </div>
                      {opt.nexNote && <span className="dc-nex-note">{opt.nexNote}</span>}
                    </button>

                    {/* Campo descritivo adicional se "Outro" selecionado */}
                    {opt.value === 'other' && isSelected && currentQuestion.hasOther && (
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
                        maxLength={180}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'scale' && (
            <div className="dc-options-grid" role="radiogroup">
              {currentQuestion.options?.map((opt) => {
                const isSelected = currentValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dc-option single ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect(opt.value)}
                  >
                    <div className="dc-option-content">
                      <div className="dc-indicator">{isSelected && '•'}</div>
                      <span>{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'textarea' && (
            <div>
              <textarea
                className="dc-textarea"
                rows={5}
                placeholder={currentQuestion.placeholder}
                value={typeof currentValue === 'string' ? currentValue : ''}
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
                {typeof currentValue === 'string' ? currentValue.length : 0} /{' '}
                {currentQuestion.maxLength || 1000} caracteres
              </div>
            </div>
          )}

          {/* Ações de Navegação */}
          <div className="dc-actions">
            {currentStepIndex > 0 ? (
              <button className="dc-back-btn" type="button" onClick={handleBack}>
                ← Voltar
              </button>
            ) : (
              <div />
            )}

            <button
              className="button dc-next-btn"
              type="button"
              onClick={saveAndAdvance}
              disabled={savingStatus === 'saving'}
            >
              {savingStatus === 'saving'
                ? 'Salvando...'
                : currentStepIndex === DIGITAL_CHECK_QUESTIONS.length - 1
                ? 'Finalizar Check'
                : 'Continuar'}{' '}
              <ArrowIcon />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
