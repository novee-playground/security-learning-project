{{- define "japanese-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "japanese-app.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "japanese-app.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "japanese-app.labels" -}}
app.kubernetes.io/name: {{ include "japanese-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
