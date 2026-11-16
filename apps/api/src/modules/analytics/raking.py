"""Algoritmo de Pós-Estratificação Iterative Proportional Fitting (Raking) e DEFF de Kish."""

from decimal import Decimal

from src.core.exceptions import DomainError

FOUR_DECIMALS = Decimal("0.0001")
EIGHT_DECIMALS = Decimal("0.00000001")


def compute_kish_deff(weights: list[Decimal]) -> tuple[Decimal, Decimal]:
    """Calcula o Efeito do Desenho Amostral (DEFF de Kish) e o N Efetivo em Decimal estrito.

    Fórmula de Kish:
        DEFF = (n * sum(w_i^2)) / (sum(w_i))^2
        n_eff = n / DEFF
    """
    n = len(weights)
    if n == 0:
        raise DomainError("Não é possível calcular o DEFF de Kish sem entrevistas válidas.")

    sum_w = sum(weights, Decimal("0"))
    sum_w_sq = sum((w * w for w in weights), Decimal("0"))
    if sum_w <= Decimal("0") or sum_w_sq <= Decimal("0"):
        raise DomainError("A soma dos pesos amostrais deve ser estritamente positiva.")

    n_dec = Decimal(n)
    deff_exact = (n_dec * sum_w_sq) / (sum_w * sum_w)
    deff = deff_exact.quantize(FOUR_DECIMALS)
    if deff < Decimal("1.0000"):
        deff = Decimal("1.0000")

    effective_n = (n_dec / deff_exact).quantize(FOUR_DECIMALS)
    return deff, effective_n


def run_iterative_proportional_fitting(
    *,
    interview_margins: list[dict[str, str]],
    target_marginal_proportions: dict[str, dict[str, Decimal]],
    max_iterations: int = 50,
    convergence_tolerance: Decimal = Decimal("0.0001"),
    min_weight_cap: Decimal = Decimal("0.2000"),
    max_weight_cap: Decimal = Decimal("5.0000"),
) -> tuple[list[Decimal], int, bool, Decimal]:
    """Executa o algoritmo Iterative Proportional Fitting (Raking) com trimming e renormalização.

    Retorna `(final_weights, iterations_run, converged, max_abs_delta)`.
    """
    n = len(interview_margins)
    if n == 0:
        raise DomainError("Não existem entrevistas válidas para executar a ponderação Raking.")

    n_dec = Decimal(n)
    weights: list[Decimal] = [Decimal("1.00000000") for _ in range(n)]
    converged = False
    max_delta = Decimal("0.0000")
    iterations_run = 0

    # Normaliza alvos marginais para somar 1.0 em cada dimensão
    normalized_targets: dict[str, dict[str, Decimal]] = {}
    for dim, cat_map in target_marginal_proportions.items():
        dim_sum = sum(cat_map.values(), Decimal("0"))
        if dim_sum <= Decimal("0"):
            raise DomainError(f"Soma das proporções da dimensão '{dim}' deve ser positiva.")
        normalized_targets[dim] = {
            cat.strip().upper(): (val / dim_sum) for cat, val in cat_map.items()
        }

    for iteration in range(1, max_iterations + 1):
        iterations_run = iteration
        max_delta = Decimal("0.0000")

        for dim, target_cats in normalized_targets.items():
            # Calcula soma atual de pesos por categoria da dimensão
            cat_sums: dict[str, Decimal] = dict.fromkeys(target_cats, Decimal("0"))
            total_w = sum(weights, Decimal("0"))

            for idx, row_margins in enumerate(interview_margins):
                cat_val = row_margins.get(dim, "").strip().upper()
                if cat_val in cat_sums:
                    cat_sums[cat_val] += weights[idx]

            # Ajusta pesos proporcionalmente à margem populacional alvo
            for idx, row_margins in enumerate(interview_margins):
                cat_val = row_margins.get(dim, "").strip().upper()
                if cat_val in target_cats and cat_sums[cat_val] > Decimal("0"):
                    target_weight_sum = target_cats[cat_val] * total_w
                    factor = target_weight_sum / cat_sums[cat_val]
                    weights[idx] = weights[idx] * factor

            # Verifica discrepância máxima pós-ajuste da dimensão
            total_w_after = sum(weights, Decimal("0"))
            for cat_val, target_prop in target_cats.items():
                achieved_sum = sum(
                    (
                        weights[i]
                        for i, rm in enumerate(interview_margins)
                        if rm.get(dim, "").strip().upper() == cat_val
                    ),
                    Decimal("0"),
                )
                achieved_prop = (
                    achieved_sum / total_w_after if total_w_after > Decimal("0") else Decimal("0")
                )
                delta = abs(achieved_prop - target_prop)
                if delta > max_delta:
                    max_delta = delta

        # Aplica weight trimming (cap mínimo e máximo) e renormaliza média = 1.0
        for i in range(n):
            if weights[i] < min_weight_cap:
                weights[i] = min_weight_cap
            elif weights[i] > max_weight_cap:
                weights[i] = max_weight_cap

        mean_w = sum(weights, Decimal("0")) / n_dec
        if mean_w > Decimal("0"):
            weights = [(w / mean_w).quantize(EIGHT_DECIMALS) for w in weights]

        if max_delta <= convergence_tolerance:
            converged = True
            break

    quantized_weights = [w.quantize(FOUR_DECIMALS) for w in weights]
    return quantized_weights, iterations_run, converged, max_delta.quantize(FOUR_DECIMALS)
