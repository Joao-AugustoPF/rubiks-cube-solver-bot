#include "JobManager.h"

namespace JobManager {

static Job               _job   = { "", JobStatus::IDLE, "", "", 0, 0, 0, 0 };
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

void setQueued(const char* jobId, uint16_t totalActions) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  strncpy(_job.id, jobId, sizeof(_job.id) - 1);
  _job.id[sizeof(_job.id) - 1] = '\0';
  _job.status                = JobStatus::QUEUED;
  _job.errorMessage[0]       = '\0';
  _job.currentActionType[0]  = '\0';
  _job.currentActionIndex    = 0;
  _job.completedActions      = 0;
  _job.totalActions          = totalActions;
  _job.startedAt             = 0;
  xSemaphoreGive(_mutex);
}

void setStarted(const char* jobId, uint16_t totalActions) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  strncpy(_job.id, jobId, sizeof(_job.id) - 1);
  _job.id[sizeof(_job.id) - 1] = '\0';
  _job.status    = JobStatus::STARTED;
  if (totalActions > 0) {
    _job.totalActions = totalActions;
  }
  _job.startedAt = xTaskGetTickCount();
  xSemaphoreGive(_mutex);
}

void setActionProgress(uint16_t currentActionIndex,
                       uint16_t completedActions,
                       const char* currentActionType) {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  _job.currentActionIndex = currentActionIndex;
  _job.completedActions   = completedActions;
  if (currentActionType) {
    strncpy(_job.currentActionType, currentActionType, sizeof(_job.currentActionType) - 1);
    _job.currentActionType[sizeof(_job.currentActionType) - 1] = '\0';
  }
  xSemaphoreGive(_mutex);
}

void setFinished() {
  xSemaphoreTake(_mutex, portMAX_DELAY);
  _job.status = JobStatus::FINISHED;
  _job.completedActions = _job.totalActions;
  if (_job.totalActions > 0) {
    _job.currentActionIndex = _job.totalActions - 1;
  }
  xSemaphoreGive(_mutex);
}
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
