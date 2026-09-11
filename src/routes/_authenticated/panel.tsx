                  {t1 && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T1</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t1.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t2t3 && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T2 · T3</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t2t3.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t4t4s && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T4 · T4S</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t4t4s.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
