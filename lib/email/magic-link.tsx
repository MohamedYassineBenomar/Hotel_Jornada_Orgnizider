/**
 * Magic-link email template (Spanish copy).
 *
 * We build the HTML by hand instead of going through `react-dom/server` so
 * Next 15's webpack rules don't reject a server-only render path during the
 * build. The file keeps the `.tsx` extension to match the architecture spec
 * even though the markup is now plain template strings.
 */

interface Props {
  url: string;
  email: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMagicLinkEmail(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const url = escapeHtml(props.url);
  const email = escapeHtml(props.email);

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f5f1;color:#1f1a16;padding:32px 16px;">
    <table align="center" width="560" style="background:#ffffff;border-radius:12px;padding:32px;">
      <tbody>
        <tr>
          <td>
            <h1 style="margin:0 0 16px;font-size:22px;">Entra en Jornada</h1>
            <p style="line-height:1.5;margin-bottom:24px;">
              Hemos recibido una petición para entrar con la cuenta <strong>${email}</strong>. Haz clic en el botón para iniciar sesión. El enlace es válido durante 15 minutos.
            </p>
            <p style="text-align:center;margin:32px 0;">
              <a href="${url}" style="background:#c5571f;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Entrar a Jornada</a>
            </p>
            <p style="font-size:13px;color:#6c5b50;">
              Si no has solicitado este correo, ignóralo. Nadie podrá entrar sin el enlace.
            </p>
            <hr style="border:none;border-top:1px solid #ede4dc;margin:24px 0 16px;" />
            <p style="font-size:12px;color:#9a877a;word-break:break-all;">${url}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

  const text = [
    "Entra en Jornada",
    "",
    `Hemos recibido una petición para iniciar sesión con la cuenta ${props.email}.`,
    "Abre este enlace para entrar (válido durante 15 minutos):",
    "",
    props.url,
    "",
    "Si no has solicitado este correo, ignóralo.",
  ].join("\n");

  return {
    subject: "Tu enlace para entrar en Jornada",
    html,
    text,
  };
}
