export const DIAGNOSIS_METADATA = {
  ok: {
    title: "Reachable",
    title_ru: "Доступно",
    severity: "ok",
    summary: "The measured path completed successfully.",
    summary_ru: "Измеренный путь завершился успешно.",
    next_step: "Submit the report as a healthy control sample.",
    next_step_ru: "Отправьте отчёт как контрольный здоровый пример."
  },
  dns_timeout: {
    title: "DNS timeout",
    title_ru: "Таймаут DNS",
    severity: "degraded",
    summary: "The resolver did not answer in time.",
    summary_ru: "DNS-резолвер не ответил за отведённое время.",
    next_step: "Repeat with the system resolver and, if appropriate, with a public resolver for comparison.",
    next_step_ru: "Повторите проверку с системным резолвером и, если уместно, с публичным резолвером для сравнения."
  },
  dns_nxdomain: {
    title: "DNS NXDOMAIN",
    title_ru: "DNS NXDOMAIN",
    severity: "degraded",
    summary: "DNS reported that the target name does not exist.",
    summary_ru: "DNS сообщил, что имя цели не существует.",
    next_step: "Check for typos and compare with another resolver before drawing conclusions.",
    next_step_ru: "Проверьте опечатки и сравните с другим резолвером перед выводами."
  },
  dns_resolver_disagreement: {
    title: "DNS resolver disagreement",
    title_ru: "Расхождение DNS-резолверов",
    severity: "degraded",
    summary: "The primary resolver failed, while a comparison resolver resolved the target.",
    summary_ru: "Основной резолвер не ответил корректно, но comparison resolver смог разрешить цель.",
    next_step: "Submit the report and collect another provider sample; this is a diagnostic signal, not bypass advice.",
    next_step_ru: "Отправьте отчёт и соберите пример у другого провайдера; это диагностический сигнал, не совет по обходу."
  },
  dns_suspicious_answer: {
    title: "Suspicious DNS answer",
    title_ru: "Подозрительный DNS-ответ",
    severity: "degraded",
    summary: "DNS returned an answer that looks unusual for the target.",
    summary_ru: "DNS вернул ответ, который выглядит необычно для этой цели.",
    next_step: "Collect more reports from other resolvers and providers.",
    next_step_ru: "Соберите больше отчётов с других резолверов и провайдеров."
  },
  dns_failure: {
    title: "DNS failure",
    title_ru: "Ошибка DNS",
    severity: "degraded",
    summary: "DNS failed with a resolver error.",
    summary_ru: "DNS-проверка завершилась ошибкой резолвера.",
    next_step: "Retry later and compare resolvers.",
    next_step_ru: "Повторите позже и сравните резолверы."
  },
  tcp_timeout: {
    title: "TCP timeout",
    title_ru: "Таймаут TCP",
    severity: "degraded",
    summary: "The TCP connection did not complete before the timeout.",
    summary_ru: "TCP-соединение не установилось до таймаута.",
    next_step: "Collect comparison reports from the same provider and another provider.",
    next_step_ru: "Соберите сравнительные отчёты у того же и другого провайдера."
  },
  tcp_reset: {
    title: "TCP reset",
    title_ru: "Сброс TCP",
    severity: "degraded",
    summary: "The TCP connection was reset.",
    summary_ru: "TCP-соединение было сброшено.",
    next_step: "Repeat the measurement to confirm the reset is stable.",
    next_step_ru: "Повторите измерение, чтобы подтвердить устойчивость сброса."
  },
  tcp_refused: {
    title: "TCP refused",
    title_ru: "TCP отказ",
    severity: "warning",
    summary: "The host actively refused the TCP connection.",
    summary_ru: "Хост активно отказал в TCP-соединении.",
    next_step: "This can be normal service behavior; compare against other networks.",
    next_step_ru: "Это может быть нормальным поведением сервиса; сравните с другими сетями."
  },
  possible_tls_dpi_or_middlebox_reset: {
    title: "Possible TLS middlebox reset",
    title_ru: "Возможный TLS-сброс middlebox/DPI",
    severity: "degraded",
    summary: "The TLS handshake was reset after ClientHello-like activity.",
    summary_ru: "TLS-handshake был сброшен после ClientHello-подобной активности.",
    next_step: "Collect several reports before treating this as a filtering signal.",
    next_step_ru: "Соберите несколько отчётов, прежде чем считать это сигналом фильтрации."
  },
  tls_timeout: {
    title: "TLS timeout",
    title_ru: "Таймаут TLS",
    severity: "degraded",
    summary: "TCP connected, but the TLS handshake did not finish.",
    summary_ru: "TCP подключился, но TLS-handshake не завершился.",
    next_step: "Compare against another network and repeat after a short delay.",
    next_step_ru: "Сравните с другой сетью и повторите через короткое время."
  },
  tls_certificate_mismatch: {
    title: "TLS certificate mismatch",
    title_ru: "Несовпадение TLS-сертификата",
    severity: "degraded",
    summary: "The certificate chain or name did not match expectations.",
    summary_ru: "Цепочка сертификата или имя не совпали с ожиданиями.",
    next_step: "Do not log in through this path; collect evidence and compare networks.",
    next_step_ru: "Не входите в аккаунты через этот путь; соберите свидетельства и сравните сети."
  },
  http_blockpage_suspected: {
    title: "Possible HTTP blockpage",
    title_ru: "Возможная HTTP-страница блокировки",
    severity: "degraded",
    summary: "The HTTP response matched conservative blockpage indicators.",
    summary_ru: "HTTP-ответ совпал с консервативными признаками страницы блокировки.",
    next_step: "Submit the sanitized report; raw page bodies are intentionally not stored.",
    next_step_ru: "Отправьте очищенный отчёт; сырое тело страницы намеренно не хранится."
  },
  http_unexpected_redirect: {
    title: "Unexpected HTTP redirect",
    title_ru: "Неожиданный HTTP-редирект",
    severity: "warning",
    summary: "The response redirected in an unexpected way.",
    summary_ru: "Ответ перенаправил запрос неожиданным образом.",
    next_step: "Compare final hosts across networks.",
    next_step_ru: "Сравните конечные хосты в разных сетях."
  },
  service_global_outage_possible: {
    title: "Possible service outage",
    title_ru: "Возможный сбой сервиса",
    severity: "warning",
    summary: "Both TCP/80 and TCP/443 timed out from this vantage point.",
    summary_ru: "TCP/80 и TCP/443 оба ушли в таймаут с этой точки наблюдения.",
    next_step: "Do not assume filtering without reports from other networks.",
    next_step_ru: "Не считайте это фильтрацией без отчётов из других сетей."
  },
  local_network_problem_possible: {
    title: "Possible local network problem",
    title_ru: "Возможная локальная проблема сети",
    severity: "warning",
    summary: "Signals point to a local or transient connectivity issue.",
    summary_ru: "Сигналы похожи на локальную или временную проблему связности.",
    next_step: "Retry on another connection if available.",
    next_step_ru: "Повторите на другом подключении, если оно доступно."
  },
  measurement_error: {
    title: "Measurement error",
    title_ru: "Ошибка измерения",
    severity: "warning",
    summary: "The tool hit an internal or unsupported network error.",
    summary_ru: "Инструмент столкнулся с внутренней или неподдерживаемой сетевой ошибкой.",
    next_step: "Open a bug report with the sanitized output.",
    next_step_ru: "Откройте bug report с очищенным выводом."
  },
  insufficient_data: {
    title: "Insufficient data",
    title_ru: "Недостаточно данных",
    severity: "unknown",
    summary: "The report does not contain enough decisive signals.",
    summary_ru: "В отчёте недостаточно решающих сигналов.",
    next_step: "Run again with default checks enabled.",
    next_step_ru: "Запустите снова с включёнными проверками по умолчанию."
  }
};

export function diagnosisMetadata(category) {
  return DIAGNOSIS_METADATA[category] || DIAGNOSIS_METADATA.insufficient_data;
}
