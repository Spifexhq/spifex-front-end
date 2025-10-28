export interface SnackbarProps {
  /** Controla a abertura do Snackbar */
  open: boolean;

  /** Tempo (ms) para fechar automaticamente */
  autoHideDuration?: number;

  /** Callback ao fechar */
  onClose: () => void;

  /** Classe extra opcional */
  className?: string;

  /** Mensagem curta; se presente, o Snackbar renderiza um “alerta” minimalista */
  message?: React.ReactNode;

  /** Severidade usada quando `message` é fornecida */
  severity?: "success" | "error" | "warning" | "info";

  /** Conteúdo livre (geralmente um Alert custom) */
  children?: React.ReactNode;

  /** Posição na tela (default: bottom-center) */
  anchor?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };

  /** Duração da transição (ms). Default: 220 */
  transitionDuration?: number;

  /** Pausar o autoHide ao passar o mouse. Default: true */
  pauseOnHover?: boolean;

  /** Fechar ao clicar no próprio snackbar. Default: false */
  dismissOnClick?: boolean;

  /** Exibe botão de fechar. Default: true */
  showCloseButton?: boolean;

  /** Largura máxima do card. Default: 28rem (max-w-md) */
  maxWidthClassName?: string; // e.g. "max-w-lg"
}
