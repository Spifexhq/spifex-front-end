import React, { useState, useEffect } from 'react';

interface SimulatedAIProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimulatedAI: React.FC<SimulatedAIProps> = ({ isOpen, onClose }) => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [response, setResponse] = useState<string | null>(null);
  const [typedResponse, setTypedResponse] = useState<string>('');

  const questionsAndAnswers: { [key: string]: string } = {
    'Como o software pode melhorar o controle de estoque da minha empresa?':
      'Nosso software permite a automação do controle de estoque, reduzindo erros humanos e garantindo que você tenha sempre uma visão clara de seu inventário.',
    'Quais são os benefícios do software para a gestão de entrada e saída de produtos?':
      'Com a gestão automatizada de entradas e saídas, você pode rastrear o fluxo de produtos em tempo real, otimizando a reposição e reduzindo custos operacionais.',
    'Como o software pode ajudar a aumentar a eficiência operacional?':
      'Nosso software centraliza todas as operações, permitindo uma gestão mais ágil e integrada dos processos da sua empresa, o que resulta em maior eficiência.',
    'De que forma o software pode auxiliar na tomada de decisões estratégicas?':
      'Através de relatórios detalhados e análise de dados, nosso software fornece insights valiosos para apoiar decisões estratégicas e melhorar a performance da sua empresa.',
    'Como o software pode otimizar o fluxo de trabalho da minha equipe?':
      'Automatizando tarefas repetitivas e integrando diferentes departamentos, nosso software libera sua equipe para focar em atividades mais estratégicas e produtivas.',
  };

  const handleQuestionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    setSelectedQuestion(selected);
    setResponse(questionsAndAnswers[selected]);
    setTypedResponse('');
  };

  useEffect(() => {
    if (response) {
      let index = 0;
      setTypedResponse('');
      const intervalId = setInterval(() => {
        setTypedResponse((prev) => prev + response[index]);
        index++;
        if (index === response.length) {
          clearInterval(intervalId);
        }
      }, 50);

      return () => clearInterval(intervalId);
    }
  }, [response]);

  const handleCloseWithReset = () => {
    setSelectedQuestion('');
    setResponse(null);
    setTypedResponse('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black opacity-50 z-40"
        onClick={handleCloseWithReset}
      ></div>

      {/* Modal centralizado */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] flex flex-col items-center">
          <h3 className="text-lg font-semibold select-none mb-4">
            Pergunte ao Assistente
          </h3>

          <div className="w-full bg-gray-100 rounded p-2 min-h-[100px] max-h-[150px] overflow-y-auto mb-2">
            {typedResponse ? (
              <p className="whitespace-pre-wrap text-base">{typedResponse}</p>
            ) : (
              <p className="text-sm text-gray-500">
                Selecione uma pergunta para ver a resposta...
              </p>
            )}
          </div>

          <div className="w-full mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selecione uma Pergunta
            </label>
            <select
              value={selectedQuestion}
              onChange={handleQuestionChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {Object.keys(questionsAndAnswers).map((question, index) => (
                <option key={index} value={question}>
                  {question}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCloseWithReset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
};

export default SimulatedAI;
