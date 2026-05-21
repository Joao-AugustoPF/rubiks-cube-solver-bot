#include "JobManager.h"

namespace JobManager {

static Job               _job   = { "", JobStatus::IDLE, "", 0 };
static SemaphoreHandle_t _mutex = nullptr;

void init() {
  _mutex = xSemaphoreCreateMutex();
  configASSERT(_mutex);
}

void setStatus(JobStatus status, const char* errorMessage) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  _job.status = status;
  if (errorMessage) {
    strncpy(_job.errorMessage, errorMessage, sizeof(_job.errorMessage) - 1);
    _job.errorMessage[sizeof(_job.errorMessage) - 1] = '\0';
  }
  xSemaphoreGive(_mutex);
}

void setQueued(const char* jobId) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  strncpy(_job.id, jobId, sizeof(_job.id) - 1);
  _job.id[sizeof(_job.id) - 1] = '\0';
  _job.status           = JobStatus::QUEUED;
  _job.errorMessage[0]  = '\0';
  _job.startedAt        = 0;
  xSemaphoreGive(_mutex);
}

void setStarted(const char* jobId) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  _job.status    = JobStatus::STARTED;
  _job.startedAt = xTaskGetTickCount();
  xSemaphoreGive(_mutex);
}

void setFinished() { setStatus(JobStatus::FINISHED); }
void setError(const char* errorMessage) { setStatus(JobStatus::ERROR, errorMessage); }

JobStatus getStatus() {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  JobStatus s = _job.status;
  xSemaphoreGive(_mutex);
  return s;
}

bool isIdle() {
  return getStatus() == JobStatus::IDLE;
}

bool isBusyWith(const char* jobId) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  bool busy = (strcmp(_job.id, jobId) == 0) &&
              (_job.status == JobStatus::QUEUED || _job.status == JobStatus::STARTED);
  xSemaphoreGive(_mutex);
  return busy;
}

void getSnapshot(Job& out) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  out = _job;
  xSemaphoreGive(_mutex);
}

const char* statusToString(JobStatus s) {
  switch (s) {
    case JobStatus::QUEUED:   return "queued";
    case JobStatus::STARTED:  return "started";
    case JobStatus::FINISHED: return "finished";
    case JobStatus::ERROR:    return "error";
    default:                  return "idle";
  }
}

}
