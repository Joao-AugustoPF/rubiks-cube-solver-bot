#pragma once

#include <Arduino.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

enum class JobStatus : uint8_t {
  IDLE,
  QUEUED,
  STARTED,
  FINISHED,
  ERROR
};

struct Job {
  char       id[64];
  JobStatus  status;
  char       errorMessage[128];
  char       currentActionType[32];
  uint16_t   currentActionIndex;
  uint16_t   completedActions;
  uint16_t   totalActions;
  TickType_t startedAt;
};

namespace JobManager {
  void      init();

  void      setStatus(JobStatus status, const char* errorMessage = nullptr);
  JobStatus getStatus();

  void      setStarted(const char* jobId, uint16_t totalActions = 0);
  void      setQueued (const char* jobId, uint16_t totalActions = 0);
  void      setActionProgress(uint16_t currentActionIndex,
                              uint16_t completedActions,
                              const char* currentActionType);
  void      setFinished();
  void      setError  (const char* errorMessage);

  bool      isIdle();
  bool      isBusyWith(const char* jobId);

  void      getSnapshot(Job& out);

  const char* statusToString(JobStatus status);
}
