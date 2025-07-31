// src/utils/validatePassword.tsx
export type PasswordValidationResult = {
  isValid: boolean;
  message: string | JSX.Element;
};

export const validatePassword = (password: string): PasswordValidationResult => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const isValid = regex.test(password);

  if (isValid) {
    return { isValid: true, message: "" };
  }

  return {
    isValid: false,
    message: (
      <div>
        <p className="font-medium">Certifique-se de que os seguintes requisitos sejam cumpridos:</p>
        <ul className="mt-2 ml-7 list-disc list-inside text-sm text-gray-800">
          <li>Pelo menos 8 caracteres</li>
          <li>Pelo menos uma letra maiúscula</li>
          <li>Pelo menos um número</li>
          <li>Pelo menos um caractere especial</li>
        </ul>
      </div>
    ),
  };
};
